<!-- docs/moteur.md - the optional publication engine: what it is, how it is wired, how to run it, deploy it and prove it. -->

# The publication engine

Reef builds two ways, and one variable chooses.

| | Engine off (default) | Engine on (`ALOHA_MOTEUR=emdash`) |
|---|---|---|
| Posts live | in `src/data/posts/*.md` | in a database (Cloudflare D1), media in R2 |
| Publishing | commit, then build | one click in the back office, visible with no build |
| The site | 100 % static, no host imposed | a Cloudflare Worker: managed pages rendered on demand, the rest prerendered |
| The back office | none | EmDash, at `/_emdash/admin` |

Engine off, the build is identical to a Reef without an engine: the 63 HTML, XML and TXT files were compared one by one (21 September 2026).

The engine is [EmDash](https://github.com/emdash-cms/emdash) (MIT licence), a CMS made for Astro and Cloudflare. Reef does not rewrite it: it plugs into it.

## Running the engine locally

```bash
pnpm dev:moteur                                              # http://localhost:4321, back office at /_emdash/admin
node scripts/moteur-import.mjs --url http://localhost:4321   # pours the Markdown posts into the database, once
```

On first start EmDash creates its tables and applies `seed/seed.json`, which describes the SCHEMA of Reef (the `posts` collection and its fields). The content goes through the API: the import puts every post through the same validation as a post typed by hand. It can be replayed: a post already present (same slug, same language) is skipped.

Locally, `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` opens an administrator session without a passkey. That door exists in development only.

## How it is wired

Six pieces, and no page knows where a post comes from.

1. **`moteur.config.mjs`** sets the Cloudflare adapter, React (the back office interface), EmDash and the two house extensions, only when the variable is set. It reads the list of managed pages from `src/moteur/pages-gerees.mjs`: those are rendered on demand, every other page stays prerendered.
2. **The `@moteur/source` alias** points to `src/moteur/source.fichiers.ts` or `src/moteur/source.emdash.ts`. Both export the same functions (`billetsPublies`, `billetParSlug`, `corpsDuBillet`) and return the same shape: an entry of the `posts` collection. No component was rewritten for the engine.
3. **`src/js/posts.ts`** stays the only place that lists posts. It reads the source through the alias; sorting, references and reading time hold for both.
4. **`src/moteur/chemins.ts`**: a page rendered on demand receives no props. `propsDeLaPage(Astro, getStaticPaths)` replays the page's own `getStaticPaths` and looks for the requested address in it. What exists at build time exists on demand, at the same place; an address the build would not have produced answers 404.
5. **`src/js/adresses.ts`** holds the path functions of the dynamic pages (post, topic, author), next to `cheminsArchive` in `src/js/archive.ts`. Each page exports them as its `getStaticPaths`, and the on-demand sitemap replays the same functions without importing a single page. That detail is load-bearing: a page imported by a module that is not a page stops being a style boundary for Astro, and the theme's stylesheet (127 KB) was ending up in the back office and in the manifest of 73 API routes before this was fixed (21 September 2026).
6. **`src/moteur/TexteRiche.*.astro`** renders the body of a post from the database (Portable Text) in the reading column, with the same heading anchors (`github-slugger`, like Astro) and the same code highlighting (Shiki, two themes).

### Adding a managed page

1. Add it to `PAGES_GEREES` (`src/moteur/pages-gerees.mjs`) and to the `CHEMINS` table of `src/moteur/plan-du-site.ts`.
2. In the page: `const props = await propsDeLaPage<Props>(Astro, getStaticPaths); if (!props) return introuvable();`.
3. Read posts through `@js/posts`, never through `getCollection("posts")`.

A forgotten page would stay frozen on the content of the last build: that is exactly the defect the engine corrects. A page listed in `PAGES_GEREES` but missing from the `CHEMINS` table makes the sitemap throw, on purpose.

### Two traps already paid for

- **`/blog/2/` lands on the article route.** On demand, a named parameter (`[id]`) comes before a rest parameter (`[...page]`). `blog/[id].astro` recognises a number and renders the archive; the rendering lives in `src/components/Pages/`.
- **`trailingSlash: "always"` breaks the engine's API.** Its routes are called without a trailing slash. Engine on, the setting switches to `"ignore"`.

## The back office

The administration is EmDash's own React application. Reef does not copy it: it pushes it as far as what it exposes allows.

- **The skin.** `src/moteur/habillage.ts` is a middleware that adds one `<style>` to the admin page: the theme's fonts, `tokens.css` read as is (`@theme` becomes `:root`, `.dark` becomes the admin's `data-mode`), then `src/moteur/back-office.css`, which gives EmDash's variables (`--color-kumo-*`, `--text-color-kumo-*`, `--radius-*`) the theme's tokens. Buttons and one-line fields become pills, headings take the display font, the focus ring is the theme's, the primary button carries the theme's ink on its primary (measured in dark mode before: white on the light turquoise, 1.66 to 1; after: the ink of the theme). `pnpm rebrand` restyles the back office in the same move. Measured on 21 September 2026 with a contrast audit of every visible text, seven views, light and dark: nothing under WCAG AA.
- **The language.** EmDash 0.38 ships its administration in 28 languages, French included (2428 strings in the catalogue, 678 still identical to English, mostly in the newest screens: media cropping, tables, passkeys). It picks the language per request: the `emdash-locale` cookie (the person's own choice, made in the language selector of the login page or the settings), then the browser's `Accept-Language`, then English. A French browser therefore gets a French back office with nothing to set. `ALOHA_BO_LANGUE=fr` gives the site a DEFAULT language for everyone (`src/moteur/langue-bo.ts` adds the cookie to a request that has none, and sets it for the next ones); each person can still change it. The theme is sold with the variable unset, so a buyer keeps English. The texts the theme adds (the "Deploy everything" page, the dashboard card) follow the same rule with two dictionaries, French and English. `ALOHA_BO_FUSEAU` (default `Europe/Paris`) sets the time zone of the times they display.
- **The dashboard card.** `src/moteur/accueil/` is a second house extension, whose `admin.widgets` entry adds a full-width card to the dashboard: the last published content (with a link to its editor), the version and build time served (the same values as `/version.json`), and two shortcuts, "View the site" and "Deploy everything". It is the only React component the theme adds to the admin (`carte.ts`, written with `createElement`, no JSX and no island on the public site); its data comes from a plugin route (`etat`) that reads the content through `ctx.content`. Why a second extension: an extension with React components only shows its pages in the menu when it has a page component, so mixing it with the Block Kit page of "Deploy everything" would have hidden that page.

## Deploying

`wrangler.moteur.jsonc` describes the Worker: database `DB`, media `MEDIA`, the `IMAGES` binding (on-demand image optimisation, see `ALOHA_IMAGES` in `moteur.config.mjs`), and a cron every minute for scheduled publications. See `DEPLOY.md`, "First deployment of the engine", for the exact commands, from the empty account to the first import.

```bash
pnpm build:moteur
npx wrangler deploy --domain blog.example.com   # never --config: see DEPLOY.md
```

With the engine on, `/secret-spot/` and `/fr/secret-spot/` answer a 302 to `/_emdash/admin` (`src/worker.moteur.ts`; `assets.run_worker_first` in `wrangler.moteur.jsonc` makes the Worker see those paths before the prerendered files): one back office per site, at the same address as every other back office of the house.

## Deploy everything

Publishing shows with nothing to do: managed pages read the database on every request. The **Deploy everything** button (back office menu, extensions section) is for the end of an editing session, and it only says what it did. It is open to whoever may publish everything (Editor role and above).

A click does three things, in this order:

1. **The guard.** One build trigger per minute at most. A refused click does nothing, caches included, and says so.
2. **The content caches.** The object cache is emptied with EmDash's own invalidation functions, on all its namespaces; the route cache (Workers Cache) with `cache.purge({ purgeEverything: true })`. What is not configured is not emptied: with no cache, the page answers "No cache configured, nothing to empty".
3. **The build of the prerendered pages.** A `POST` on the Deploy Hook of Cloudflare Workers Builds, whose address lives in the secret variable `ALOHA_DEPLOY_HOOK`. It is written neither in the repository, nor in the log, nor in a message.

```bash
npx wrangler secret put ALOHA_DEPLOY_HOOK --config wrangler.moteur.jsonc   # online
echo 'ALOHA_DEPLOY_HOOK=https://...' > .dev.vars                            # locally, a file git ignores
```

The Deploy Hook is created in Cloudflare, in the Worker's settings, Builds. Variable absent: the caches are handled, the page says the build was NOT restarted and recalls the command. Only an `https` address is accepted; `astro dev` also accepts `http://localhost` and `http://127.0.0.1`, to try the button against a fake hook.

### The proof

`/version.json` (rendered on demand, never cached) gives the version from `package.json` and the build timestamp, fixed at build time:

```json
{ "version": "3.1.0", "construit": "2026-09-21T21:01:22.579Z", "moteur": "emdash" }
```

As long as the old Worker answers, the timestamp does not move; as soon as the new one is online, it changes. The page compares this timestamp with the last successful trigger and shows "Redeployment proven" or "Build requested, not online yet". It also shows the time of the last trigger, the HTTP code the hook returned, and the last five clicks (who, when, caches, build, code). The log keeps fifty clicks, in the extension's storage, so in the site's database.

### The caches

None by default: a publication is visible in under 100 ms (see below), and a cache would only add a place for a stale page to hide. Two are available, each behind one variable, both emptied at every publication and by the button.

**The object cache** (`ALOHA_CACHE_OBJETS`) keeps the database reads. `kv` stores them in Cloudflare KV (declare a `CACHE` binding in `wrangler.moteur.jsonc`); `memoire` keeps them in the process memory, for local trials. EmDash invalidates the namespace of a collection at every write.

**The route cache** (`ALOHA_CACHE_ROUTES`) keeps whole responses. `cloudflare` uses Workers Cache: every managed page and the content sitemap then declare `maxAge: 60, swr: 600` and carry the tags of the collections of the schema; at every publication EmDash purges the tags of the collection and of the entry, and the next request is rendered fresh; the button purges everything. The rules are written one pattern per language (`/blog/[id]`, `/fr/blog/[id]`, see `src/moteur/routes-du-cache.mjs` and its selfcheck), never with the page's own `[...locale]` pattern: a rest parameter matches everything, and the first version of these rules was stamping `Cloudflare-CDN-Cache-Control: public` on the engine's API responses (measured on 21 September 2026, fixed the same night). Nothing under `/_emdash/` carries a cache rule. `memoire` does the same in the process memory, for local trials only. With `cloudflare`, Workers Cache must also be switched on in `wrangler.moteur.jsonc` (Wrangler 4.69 or later):

```jsonc
"cache": { "enabled": true }
```

The routes that are not managed pages carry no cache rule: EmDash's API and admin already send `private, no-store` (and the adapter adds `Cloudflare-CDN-Cache-Control: no-store` to them), and `/version.json` sends `no-store`.

The `cloudflare` provider is the adapter's own, wrapped by `src/moteur/cache-routes.ts` for one reason: EmDash invalidates the route cache AFTER writing, and in the local workerd `cache.purge` does not exist, so every creation of a post was answering an empty 404 while the post was in the database (measured on 22 September 2026). The wrapper writes the failed purge in the Worker's log and lets the response through. Online, with Workers Cache enabled, the purge goes through; a Worker deployed with `ALOHA_CACHE_ROUTES=cloudflare` but without `cache.enabled` keeps publishing, and the "Deploy everything" page says the route cache was NOT emptied.

**Proven locally** on the production build served by workerd, 21 September 2026, `ALOHA_CACHE_ROUTES=memoire` and `ALOHA_CACHE_OBJETS=memoire`: `/blog/` answers `X-Astro-Cache: HIT` on the second request; right after `publish()` through the API, `/blog/`, the new post and `/rss.xml` all answer `MISS` with the new content on their first request (three passes, 40 to 107 ms after the call returned); after `unpublish()` the post answers 404 and leaves the list on the first request (31 to 112 ms). The purge at publication is therefore real, end to end, with the memory provider.

**Also checked locally** with `ALOHA_CACHE_ROUTES=cloudflare`: the managed pages answer `Cache-Tag: posts,astro-path:/blog/` and `Cloudflare-CDN-Cache-Control: public, max-age=60, stale-while-revalidate=600`; the API, the admin and `/version.json` answer `no-store`; a post created, published and unpublished through the API answers 200 then 404 on the site, with the purge written as impossible in the log.

**NOT proven locally**, because the local workerd has no Workers Cache: the `cloudflare` provider's purge (`cache.purge` from `cloudflare:workers`, called by EmDash at each publication and by the button with `purgeEverything`) and the edge behaviour itself. To verify online, after the first deployment with `ALOHA_CACHE_ROUTES=cloudflare`:

```bash
curl -sI https://your-site.example/blog/ | grep -i "cf-cache-status\|cache-tag"   # twice: MISS then HIT
# publish a post in the back office, then:
curl -sI https://your-site.example/blog/ | grep -i cf-cache-status                # MISS again, and the post is in the page
```

If `cf-cache-status` never appears, Workers Cache is not enabled for the Worker (`cache.enabled` in the Wrangler file). The "Deploy everything" page names the route cache provider it found; a provider it cannot purge as a whole (`memory`) is named, not claimed emptied.

### Where it lives

`src/moteur/deployer/` is a **native** EmDash extension (it acts with the site's authority: a "sandbox" extension can neither empty a host cache nor read a Worker secret), registered by `moteur.config.mjs`, engine on only. The page is described in Block Kit, without React: the back office renders it with its own components, so it inherits `back-office.css`. `regles.ts` holds the pure logic (guard, hook address, readable time in the site's time zone), verified by `pnpm test`; `textes.fr.ts` and `textes.en.ts` hold every sentence.

Tried on 21 September 2026, locally: the `POST` reaches the fake hook once and the second click within the minute is refused; hook down or answering 500, the page writes it in an error banner; with `ALOHA_CACHE_OBJETS=memoire`, a title changed directly in the database stays the old one on the site until the click, then switches to the new one. **Not proven locally**: the real purge of Workers Cache (see above) and the call of a real Deploy Hook, which need a deployment.

## What was measured

Production build served by workerd locally, three passes, 21 September 2026, on the final HEAD of version 3.1.0 (route cache and object cache in memory, so that the purge is part of the measure):

| Gesture | Visible on the site after |
|---|---|
| Publish | 40 to 107 ms (post, list and RSS feed, first request each) |
| Correct a title and republish | 36 to 49 ms |
| Unpublish | 31 to 112 ms (the page answers 404 and leaves the list) |

A draft answers 404 as long as it is not published. These figures are local: online, the network and Cloudflare's edge are added, to be measured after the first deployment.
