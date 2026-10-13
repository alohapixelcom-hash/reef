<!-- DEPLOY.md - putting Reef online: the static site, the publication engine (first deployment, releases, database updates), and what not to break. -->

# Deploying Reef

## The static site

```bash
pnpm build        # writes dist/
```

`dist/` is plain HTML, CSS and images: upload it to any static host
(Cloudflare, Netlify, Vercel, an nginx box). No adapter, no server, no
environment variable.

To publish it as a Cloudflare Worker with static assets, `npx wrangler deploy`
uses `wrangler.toml` and `src/worker.ts`: the visitor's language on `/`, the
sitemaps and the 404 page in the language of the address.

## With the publication engine

Online, the engine is two Cloudflare Workers built from the same source:

| Worker | Configuration | Role |
|---|---|---|
| `reef-moteur` | `wrangler.moteur.jsonc` (the build writes `dist/server/wrangler.json`) | EmDash, the database (D1 `reef-moteur`), the media (R2 `reef-moteur-media`), the back office and the pages rendered on demand. No domain. |
| `reef-frontal` | `wrangler.frontal.jsonc`, entry `src/worker.frontal.ts` | Holds the domain. Serves the files and the pages already kept, and wakes the engine only for a page not kept yet, the back office and the API. A publication changes the content version, so readers see it on the next request. |

The `x-aloha-cache` response header says what the front Worker did (`HIT`,
`MISS`, `MOTEUR`, `PRIVEE`, `FIGEE`).

### First deployment

It needs a Cloudflare account with Workers, D1 and R2, and Cloudflare Images
for on-demand image resizing (build with `ALOHA_IMAGES=origine` to do
without it).

1. **Sign in and create the storage.** The names are those of
   `wrangler.moteur.jsonc`:

   ```bash
   npx wrangler login
   npx wrangler d1 create reef-moteur
   npx wrangler r2 bucket create reef-moteur-media
   ```

2. **Build and deploy the engine, without a domain.**

   ```bash
   pnpm install --frozen-lockfile
   pnpm build:moteur
   npx wrangler deploy
   ```

   Run `wrangler deploy` without `--config`: the build points Wrangler at
   `dist/server/wrangler.json`, the real configuration of the Worker. The
   first deployment also creates the sessions KV namespace.

3. **Put the front Worker on the domain.** Copy the database id
   (`npx wrangler d1 list`) into the `d1_databases` entry of
   `wrangler.frontal.jsonc`, then:

   ```bash
   DOMAINE=blog.example.com bash scripts/deployer-frontal.sh --a-sec   # dry run: both bundles built, nothing sent
   DOMAINE=blog.example.com bash scripts/deployer-frontal.sh
   ```

   The domain must be a hostname of a zone of the same Cloudflare account;
   the script attaches it to `reef-frontal`, DNS record and certificate
   included, then checks that it answers.

4. **The first administrator.** Open `https://<your-domain>/_emdash/admin`
   (or `/secret-spot/`, which leads there). Do it on the final domain: the
   passkey is bound to the hostname. The setup asks for the site title, an
   email and a name, then registers a passkey on the device in use.

5. **Import the demo posts, if you want them.** In the back office,
   « Paramètres », API tokens: create a token with the `admin` scope, then:

   ```bash
   EMDASH_TOKEN=<the token> node scripts/moteur-import.mjs --url https://<your-domain>
   ```

   One post per Markdown file and language, covers uploaded, drafts kept as
   drafts. A post already present is skipped, so the command can run again.

6. **Check.** `https://<your-domain>/version.json` gives the version and the
   build time; `/blog/`, a post and `/sitemap-index.xml` answer 200; an
   invented address answers 404, in French under `/fr/`. Publish a post in
   the back office and reload it on the site: no build is involved.

Optional, at build time: `ALOHA_BO_LANGUE` (default language of the back
office: French without it, `en`, or `navigateur` to follow the browser),
`ALOHA_BO_FUSEAU=Europe/Paris` (time zone of the times shown by the house
screens), `ALOHA_CACHE_OBJETS=kv` (with a `CACHE` KV binding in the Wrangler
file), `ALOHA_CACHE_ROUTES=cloudflare` (with `"cache": { "enabled": true }`).

The « Mettre le site à jour » button empties the caches; to also rebuild the
prerendered pages it needs a Cloudflare Deploy Hook:
`npx wrangler secret put ALOHA_DEPLOY_HOOK --config wrangler.moteur.jsonc`.

### Every release

```bash
pnpm build:moteur
bash scripts/deployer-frontal.sh --a-sec   # dry run
bash scripts/deployer-frontal.sh           # the engine, then the front Worker, then an online check
```

Both Workers are deployed each time: the front Worker serves the files of
`dist/client`, so a new engine behind an old front Worker would serve old
files. To put the domain back on the engine, with the build already online:
`bash scripts/deployer-frontal.sh --retour`.

### Updating a database already online

A database online holds content the editors may have changed, so it is never
seeded again. Each version that changes it ships one file in `migrations/`,
applied in order, each once, before deploying the new code:

```bash
npx wrangler d1 export reef-moteur --remote --output=backup.sql                               # a full backup first
node scripts/base-3.4.0.mjs --remote reef-moteur --sql migrations/import-3.8.5-reef.sql              # the plan: nothing is written
node scripts/base-3.4.0.mjs --remote reef-moteur --sql migrations/import-3.8.5-reef.sql --appliquer  # the missing columns, then the file
```

The plan lists the columns to add and the writes that will be left aside
because the value was already changed by hand. Every file is idempotent (a
second run changes nothing) and none contains a `DELETE` or a `DROP`.

| From | File | What it changes |
|---|---|---|
| before 3.3.0 | `import-3.3.0-reef.sql` | the page texts (`sections`) and the legal pages; apply it with `npx wrangler d1 execute reef-moteur --remote --config wrangler.moteur.jsonc --file=migrations/import-3.3.0-reef.sql` |
| 3.3.x | `import-3.4.0-reef.sql` | the whole site in the back office: collections, fields, menus, settings |
| 3.4.0, 3.5.0 | `import-3.6.0-reef.sql` | « Couleur d'origine du thème » in the brand colours |
| 3.6.x, 3.8.0 | `import-3.8.1-reef.sql` | « Police du site », « Place du bloc sur l'accueil » |
| 3.8.1 | `import-3.8.2-reef.sql` | « Logo pour le mode sombre » |
| 3.8.2 | `import-3.8.3-reef.sql` | author and topic chosen by name, native tags, the newsletter tables |
| 3.8.3 | `import-3.8.4-reef.sql` | help texts of the back office, tables of the demo posts |
| 3.8.4 | `import-3.8.5-reef.sql` | the table of the contact form messages (« Messages » screen) |

## What not to break

- **Never deploy the engine with `--domain`.** The domain would go back to
  `reef-moteur` and bypass the front Worker; `scripts/deployer-frontal.sh`
  deploys the engine without a domain, then the front Worker with it.
- **Keep `packageManager` in `package.json`.** It pins the pnpm version that
  reads `allowBuilds` in `pnpm-workspace.yaml`; with an older pnpm, esbuild
  and sharp get no native binary and a CI build fails.
- **Keep `run_worker_first = true` in `wrangler.toml`.** Without it `/` is
  served straight from `index.html` and the language redirect never runs.

## The photographs

The photographs of `src/assets/` come from Pexels, under the Pexels licence,
which allows redistribution. They are not stored in the repository:
`scripts/covers.mjs` fetches them before every build. [NOTICE.md](NOTICE.md)
and [PHOTOS.md](PHOTOS.md) say which ones and where from.

## Release 4.0.0 (core 2.0.0)

Same deployment as 3.9.0 below (Time Travel bookmark of `reef-moteur` first,
`pnpm build:moteur`, the engine, then the front Worker, never `--domain`), and
no SQL: the five fields of the « Design » page (`h1_size`, `h2_size`,
`h3_size`, `text_size`, `radius` of the `site` entry) are added by that page on
its first save, through EmDash's schema API. Online check: `/version.json` says
4.0.0, the sidebar of `/_emdash/admin` reads in sections and shows « Design »
under Appearance.

## Release 3.9.0 (core 1.16.0)

The domain stays on the front Worker: both Workers are deployed without
`--domain`, and `workers_dev` and `preview_urls` are false in both files, so
neither gets another public address. Take a Time Travel bookmark of the
database first (`npx wrangler d1 time-travel info reef-moteur`).

```bash
pnpm build:moteur
npx wrangler deploy -c dist/server/wrangler.json   # the engine
npx wrangler deploy -c wrangler.frontal.jsonc      # the front Worker
```

Then the SQL of the release, once, on the database already online (idempotent, no DELETE, no DROP: the blog takes the house label in the sidebar, the home title goes under 60 characters):

```bash
npx wrangler d1 execute reef-moteur --remote --config wrangler.moteur.jsonc --file=migrations/import-3.9.0-reef.sql
```

Online check: `/sitemap-index.xml` lists only `/sitemap-moteur.xml`, every
address of it answers 200 with its own canonical
(`node scripts/verifier-plan.mjs https://reef.alohapixel.app --anciens`),
`/sitemap-contenu.xml` and `/sitemap-0.xml` answer 301, `robots.txt` and
`llms.txt` carry `x-aloha-seo`.
