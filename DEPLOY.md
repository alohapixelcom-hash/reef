<!-- DEPLOY.md - how the live demo is published, and how the optional publication engine is deployed for the first time. -->

# Deploying the demo

`reef.alohapixel.app` is the Cloudflare Worker **reef-demo**. Since
19 August 2026 it has been published automatically by **Workers Builds** on
every push to `main`. There is nothing left to run from a Mac.

| Setting | Value |
|---|---|
| Repository | `alohapixelcom-hash/reef` |
| Production branch | `main` |
| Build command | `pnpm run build` |
| Deploy command | `npx wrangler deploy` |

## Three things not to break

**`packageManager: pnpm@11.22.0` in package.json.** Otherwise the Cloudflare CI
starts on pnpm 10, which does not read the `allowBuilds` key of
`pnpm-workspace.yaml`: esbuild and sharp would be left with no native binary,
and the build would fail without saying why. Verified on 19 August on aloha,
where the exact error was `ERROR packages field missing or empty`.

**`run_worker_first = true` in wrangler.toml.** Without it, Cloudflare serves
`index.html` directly for `/` and the language redirect never runs. That is also
why the worker tests the extension of the path itself: it sees every request and
has to let stylesheets through.

**`wrangler.toml` and `src/worker.ts` belong to the demo.** They publish
`reef.alohapixel.app` and nothing else. The theme itself compiles to static HTML
and deploys to any host without them.

## The images

The photographs in `src/assets/` come from Pexels and are under the Pexels
licence. They are not versioned: `scripts/covers.mjs` fetches them before every
build, and the archive of the theme already contains them. The Pexels licence
allows redistribution, so nothing is taken away from anyone. `NOTICE.md`
section 1 and `PHOTOS.md` say which ones, and where from. Keeping them or
replacing them with your own comes to the same thing as far as the licence is
concerned.

## First deployment of the engine

Everything above concerns the static demo. The optional publication engine
(`ALOHA_MOTEUR=emdash`, see `docs/moteur.md`) is a second, separate Worker,
described by `wrangler.moteur.jsonc`. It needs a Cloudflare account with
Workers, D1 and R2 enabled, and Cloudflare Images for the on-demand image
optimisation (set `ALOHA_IMAGES=origine` at build time to do without it). The
steps below were written from the configuration files and the EmDash 0.38
routes; they have not yet been run against a live account.

1. **Sign in and create the storage.** `wrangler deploy` creates a missing D1
   database and R2 bucket on its own, but creating them first keeps the first
   deploy readable:

   ```bash
   npx wrangler login
   npx wrangler d1 create reef-moteur
   npx wrangler r2 bucket create reef-moteur-media
   ```

   The names are the ones in `wrangler.moteur.jsonc` (`database_name`,
   `bucket_name`). Nothing else to edit: the bindings are found by name.

2. **Build and deploy the Worker.**

   ```bash
   pnpm install --frozen-lockfile
   pnpm build:moteur
   npx wrangler deploy --domain blog.example.com
   ```

   Run `wrangler deploy` WITHOUT `--config`: the build writes the real Worker
   configuration to `dist/server/wrangler.json` and points
   `.wrangler/deploy/config.json` at it, and Wrangler follows that pointer
   only when no configuration file is named. With `--config
   wrangler.moteur.jsonc` it bundles the raw source instead and fails on
   `@emdash-cms/cloudflare/worker` (measured on 22 September 2026). The first
   deploy creates the D1 database, the R2 bucket and the sessions KV namespace
   on its own. `--domain` attaches the Worker to a hostname of a zone of the
   same Cloudflare account, DNS record and certificate included; without it
   the Worker answers on its `workers.dev` address, which browsers may flag
   while it is brand new.

   Optional variables at build time: `ALOHA_BO_LANGUE` (default language of
   the back office, French without it; a language code changes it,
   `navigateur` lets each browser decide), `ALOHA_BO_FUSEAU=Europe/Paris`
   (time zone of the times the
   house extensions display), `ALOHA_CACHE_OBJETS=kv` (with a `CACHE` KV
   binding added to the Wrangler file), `ALOHA_CACHE_ROUTES=cloudflare` (with
   `"cache": { "enabled": true }` added to the Wrangler file). None is needed.

3. **Secrets, if any.** The engine needs no secret to run. The "Deploy
   everything" button needs the address of a Deploy Hook (Cloudflare, the
   Worker's settings, Builds) to restart the build of the prerendered pages:

   ```bash
   npx wrangler secret put ALOHA_DEPLOY_HOOK --config wrangler.moteur.jsonc
   ```

   Without it the button still empties the caches and says the build was not
   restarted.

4. **The first administrator.** Open `https://<your-domain>/secret-spot/`
   (with the engine on, that address, and its French twin, open
   `/_emdash/admin`; the static back office of the theme is not served).
   Do it on the final domain: the passkey is bound to the hostname it was
   created on.
   The setup wizard asks for the site title and tagline, then an email and a
   name, then registers a passkey on the device in use: that passkey is the
   administrator account. The wizard runs once; afterwards the same address is
   the login page (passkey, or a link sent by email once an email provider is
   configured in the settings).

5. **An API token for the import.** In the back office, Settings, API tokens:
   create a token with the `admin` scope. The import creates posts
   (`content:write`), uploads covers (`media:write`) and, on an empty
   collection, realigns the schema fields the seed cannot express
   (`schema:write`): `admin` covers the three. Copy it once; it is not shown
   again.

6. **Import the content.**

   ```bash
   EMDASH_TOKEN=<the token> node scripts/moteur-import.mjs --url https://<your-domain>
   ```

   The script creates one post per Markdown file and language, uploads the
   covers, and publishes what was not a draft. It can be run again: a post
   already present is skipped.

7. **Check.** `https://<your-domain>/version.json` gives the version and the
   build time; `/blog/`, a post, `/sitemap-index.xml` and
   `/sitemap-contenu.xml` must answer 200; an invented address 404. Publish a
   post in the back office and reload it on the site: no build is involved.

8. **Workers Builds, for the prerendered pages.** Connect the repository in the
   Worker's settings, with `ALOHA_MOTEUR=emdash pnpm build:moteur` as the build
   command and `npx wrangler deploy` as the
   deploy command. Then create the Deploy Hook of step 3. From then on, the
   "Deploy everything" button restarts that build, and `/version.json` proves
   when the new build is online.
