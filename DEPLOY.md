<!-- DEPLOY.md - how the live demo is published (with the engine), and how the optional publication engine is deployed for the first time. -->

# Deploying the demo

`reef.alohapixel.app` has been served since 22 September 2026 by the
**reef-moteur** Worker (EmDash engine, D1 `reef-moteur`, R2
`reef-moteur-media`), described by `wrangler.moteur.jsonc`. Since 3.8.0 the
domain is on **reef-frontal**, a light Worker in front of the engine (see
"The front Worker" below). The static `reef-demo` Worker no longer carries the
domain.

| Setting | Value |
|---|---|
| Workers | `reef-frontal` on the domain (`wrangler.frontal.jsonc`, entry `src/worker.frontal.ts`), in front of `reef-moteur` (`wrangler.moteur.jsonc`, no domain) |
| Build command | `pnpm build:moteur` (sets `ALOHA_MOTEUR=emdash` itself) |
| Deploy command | `bash scripts/deployer-frontal.sh`, from the Mac, after the build (both Workers) |
| Check | `https://reef.alohapixel.app/version.json` answers `{"version":"3.8.0",...,"moteur":"emdash"}`; a public page carries `x-aloha-cache` (`MISS`, then `HIT`) |

```bash
pnpm build:moteur
bash scripts/deployer-frontal.sh --a-sec   # dry run: both bundles are built, nothing is sent
bash scripts/deployer-frontal.sh           # the engine without a domain, then the front Worker with the domain, then an online check
```

Every release deploys BOTH Workers: the front Worker serves the files of
`dist/client`, so a new engine behind an old front Worker would serve old
files. To put the domain back on the engine (same build, already online):
`bash scripts/deployer-frontal.sh --retour`.

A release whose texts also live in the database ships a SQL file to run once
after the deployment. For 3.3.0, `seed/import-3.3.0-reef.sql` (the page texts,
and the corrected legal notice, privacy policy and terms):

```bash
npx wrangler d1 execute reef-moteur --remote --config wrangler.moteur.jsonc --file=seed/import-3.3.0-reef.sql
```

It is idempotent: a second run changes nothing.

Since then, two steps, in this order, for a database already online: 3.4.0
through `node scripts/base-3.4.0.mjs --remote reef-moteur` (the plan, nothing
written) then the same command with `--appliquer` (the columns, then
`import-3.4.0-reef.sql`), see docs/moteur.md; 3.6.0 through a single file,
`import-3.6.0-reef.sql` (« Couleur d'origine du thème » in the list of brand
colours), idempotent, with no DELETE and no DROP. 3.6.1, 3.6.2 and 3.8.0 do not
change the database. 3.8.1 adds two fields (« Police du site », « Place du bloc
sur l'accueil »): `node scripts/base-3.4.0.mjs --remote reef-moteur --sql
import-3.8.1-reef.sql` shows the plan, the same command with `--appliquer` adds
the two columns then passes the file; idempotent, no DELETE, no DROP, no
content touched. Run it before deploying 3.8.1 (the code reads the fields but
renders the theme as long as they are absent). 3.8.2 adds one field (« Logo pour le mode sombre »):
`node scripts/base-3.4.0.mjs --remote reef-moteur --sql import-3.8.2-reef.sql`,
then the same command with `--appliquer`; idempotent, no DELETE, no DROP.

```bash
npx wrangler d1 execute reef-moteur --remote --config wrangler.moteur.jsonc --file=import-3.6.0-reef.sql
```

## The front Worker (3.8.0)

`reef-frontal` (`src/worker.frontal.ts`, shared base module `frontal`)
receives every request of the domain. It serves the files, the redirects and
the pages already kept, and wakes `reef-moteur` (through the `MOTEUR` binding)
only for a page not kept yet, the back office and the API. An editor, or any
session, always goes to the engine and is never kept; a publication changes
the content version, so the cache key: the visitor sees it about one second
later (measured locally). The `x-aloha-cache` header says what happened
(`HIT`, `MISS`, `MOTEUR`, `PRIVEE`, `FIGEE`...). The engine keeps its cron and
has no public route.

## Four things not to break

**Never deploy the engine with `--domain` again.** The domain would go back to
`reef-moteur` and the front Worker would be bypassed. `scripts/deployer-frontal.sh`
deploys the engine without a domain, then the front Worker with it.

**`packageManager: pnpm@11.22.0` in package.json.** Otherwise the Cloudflare CI
starts on pnpm 10, which does not read the `allowBuilds` key of
`pnpm-workspace.yaml`: esbuild and sharp would be left with no native binary,
and the build would fail without saying why. Verified on 19 August on aloha,
where the exact error was `ERROR packages field missing or empty`.

**`run_worker_first = true` in wrangler.toml.** Without it, Cloudflare serves
`index.html` directly for `/` and the language redirect never runs. That is also
why the worker tests the extension of the path itself: it sees every request and
has to let stylesheets through.

**`wrangler.toml` and `src/worker.ts` describe the frozen static demo**
(`reef-demo`, `pnpm run build`), kept off the domain: the language redirect,
the sitemaps and the French 404 page, with no engine. The theme itself compiles
to static HTML and deploys to any host without them.

## The images

The photographs in `src/assets/` come from Pexels and are under the Pexels
licence. They are not versioned: `scripts/covers.mjs` fetches them before every
build, and the archive of the theme already contains them. The Pexels licence
allows redistribution, so nothing is taken away from anyone. `NOTICE.md`
section 1 and `PHOTOS.md` say which ones, and where from. Keeping them or
replacing them with your own comes to the same thing as far as the licence is
concerned.

## First deployment of the engine

For your own site. The optional publication engine (`ALOHA_MOTEUR=emdash`, see
`docs/moteur.md`) is a Worker described by `wrangler.moteur.jsonc`, the one
that serves the live demo. It needs a Cloudflare account with Workers, D1 and
R2 enabled, and Cloudflare Images for the on-demand image optimisation (set
`ALOHA_IMAGES=origine` at build time to do without it). These steps are the
ones the demo went through in September 2026.

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

2. **Build and deploy the Worker, without a domain.**

   ```bash
   pnpm install --frozen-lockfile
   pnpm build:moteur
   npx wrangler deploy
   ```

   Run `wrangler deploy` WITHOUT `--config`: the build writes the real Worker
   configuration to `dist/server/wrangler.json` and points
   `.wrangler/deploy/config.json` at it, and Wrangler follows that pointer
   only when no configuration file is named. With `--config
   wrangler.moteur.jsonc` it bundles the raw source instead and fails on
   `@emdash-cms/cloudflare/worker` (measured on 22 September 2026). The first
   deploy creates the D1 database, the R2 bucket and the sessions KV namespace
   on its own. The engine gets no domain: the front Worker takes it.

   Then put the front Worker on the domain. Copy the database id
   (`npx wrangler d1 list`) into the `d1_databases` entry of
   `wrangler.frontal.jsonc`, then deploy both Workers:

   ```bash
   DOMAINE=blog.example.com bash scripts/deployer-frontal.sh --a-sec   # dry run, nothing sent
   DOMAINE=blog.example.com bash scripts/deployer-frontal.sh
   ```

   The script attaches the domain to `reef-frontal` (a hostname of a zone of
   the same Cloudflare account, DNS record and certificate included), then
   checks that the domain answers through it. Every later release runs the
   same command; `--retour` puts the domain back on the engine.

   Optional variables at build time: `ALOHA_BO_LANGUE` (default language of
   the back office, French without it; a language code changes it,
   `navigateur` lets each browser decide), `ALOHA_BO_FUSEAU=Europe/Paris`
   (time zone of the times the
   house extensions display), `ALOHA_CACHE_OBJETS=kv` (with a `CACHE` KV
   binding added to the Wrangler file), `ALOHA_CACHE_ROUTES=cloudflare` (with
   `"cache": { "enabled": true }` added to the Wrangler file). None is needed.

3. **Secrets, if any.** The engine needs no secret to run. The "Update the
   site" button (« Mettre le site à jour ») needs the address of a Deploy Hook (Cloudflare, the
   Worker's settings, Builds) to restart the build of the prerendered pages:

   ```bash
   npx wrangler secret put ALOHA_DEPLOY_HOOK --config wrangler.moteur.jsonc
   ```

   Without it the button still empties the caches and says the build was not
   restarted.

4. **The first administrator.** Open `https://<your-domain>/secret-spot/`
   (with the engine on, that address, and its French twin, open
   `/_emdash/admin`, the one back office of the site).
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

   The page texts (collection `sections`, docs/moteur.md, "The page texts")
   come with the seed when the setup wizard is run with its demo content. A
   database set up without it, or deployed before 3.3.0, gets them once from
   `npx wrangler d1 execute reef-moteur --remote --config wrangler.moteur.jsonc --file=seed/import-3.3.0-reef.sql`
   (idempotent). Until then the pages show the texts of the files.

7. **Check.** `https://<your-domain>/version.json` gives the version and the
   build time; `/blog/`, a post, `/sitemap-index.xml` and
   `/sitemap-contenu.xml` must answer 200, `/sitemap.xml` a 301 to the index;
   an invented address 404, in French under `/fr/`. Publish a
   post in the back office and reload it on the site: no build is involved.

8. **Optional: Workers Builds, for the prerendered pages.** The demo is
   deployed from the Mac; to have the button rebuild on its own, connect the repository in the
   Worker's settings, with `ALOHA_MOTEUR=emdash pnpm build:moteur` as the build
   command and `npx wrangler deploy` as the
   deploy command. Then create the Deploy Hook of step 3. From then on, the
   "Update the site" button restarts that build, and `/version.json` proves
   when the new build is online. That build deploys the engine only: the
   front Worker keeps the files of its last deployment until
   `scripts/deployer-frontal.sh` runs again (not proven online).
