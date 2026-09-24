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

The engine is [EmDash](https://github.com/emdash-cms/emdash) 0.38 (MIT licence), a CMS made for Astro and Cloudflare. Reef does not rewrite it: it plugs into it.

The live demo runs with the engine on: `reef.alohapixel.app` has been served since 22 September 2026 by the Worker `reef-moteur` (D1 `reef-moteur`, R2 `reef-moteur-media`), built with `pnpm build:moteur` and deployed from the Mac with `npx wrangler deploy` (DEPLOY.md). The checks below were first run on a local build.

## Running the engine locally

```bash
pnpm dev:moteur                                              # http://localhost:4321, back office at /_emdash/admin
node scripts/moteur-import.mjs --url http://localhost:4321   # pours the Markdown posts into the database, once
```

On first start EmDash creates its tables and applies `seed/seed.json`, which describes the SCHEMA of Reef (the `posts` collection and its fields). The content goes through the API: the import puts every post through the same validation as a post typed by hand. It can be replayed: a post already present (same slug, same language) is skipped.

Locally, `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` opens an administrator session without a passkey. That door exists in development only; the session it opens also holds for `astro preview` of the production build, which reads the same local state (`.wrangler/state`): that is how the edit mode is measured on the build that ships.

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
2. In the page: `const props = await propsDeLaPage<Props>(Astro, getStaticPaths); if (props instanceof Response) return props;`.
3. Read posts through `@js/posts`, never through `getCollection("posts")`.
4. Read the copy with `const t = await textesDeLaPage(Astro)` (`src/moteur/textes.ts`) before any component renders; components read it with `useTranslations(Astro)` (see "The page texts" below).

A forgotten page would stay frozen on the content of the last build: that is exactly the defect the engine corrects. A page listed in `PAGES_GEREES` but missing from the `CHEMINS` table makes the sitemap throw, on purpose.

### Two traps already paid for

- **`/blog/2/` lands on the article route.** On demand, a named parameter (`[id]`) comes before a rest parameter (`[...page]`). `blog/[id].astro` recognises a number and renders the archive; the rendering lives in `src/components/Pages/`.
- **`trailingSlash: "always"` breaks the engine's API.** Its routes are called without a trailing slash. Engine on, the setting switches to `"ignore"`.

### Images rendered on demand

- **An image without a quality weighs ten times more.** At build time sharp encodes with its defaults (80 for WebP and JPEG, 50 for AVIF); on demand, the adapter's `/_image` address carried no `q`, and the Cloudflare Images binding then encodes almost losslessly (the demo's lead image: 569 KB at 390 px and 1.5 MB at 1440 px online on 24 September 2026, against 100 to 200 KB in the static build). `src/moteur/service-image.ts`, aliased onto the adapter's service (`@astrojs/cloudflare/image-service-workerd`, engine on only, see `moteur.config.mjs`), writes the build's quality into every address; `qualite-image.selfcheck.ts` compares it with the installed sharp. The alias keeps the service's name, so the prerendered files of the engine build keep the same images, and the static build never reads the file. The local emulation of the Images binding ignores `q`: the gain only shows online.
- **A post's share card is a 1200x630 JPEG, made by the theme.** With the engine on, a cover lives in the media library (`/_emdash/api/media/file/<key>`, a WebP of any size and shape). EmDash's own `/_image` endpoint cannot crop it: for a media file it passes the width and height to the Images binding but not `fit`, so `w=1200&h=630&fit=cover` gave a portrait cover back at 504x630 (measured locally on 24 September 2026). The route `/og/billet/<key>.jpg` (`src/moteur/carte-du-billet.ts`, injected by `moteur.config.mjs`) reads the cover from storage the way EmDash does and crops it with the binding (`fit: "cover"`, JPEG quality 80); the post page gives that address as `og:image` and `twitter:image`. A post without a cover, a cover outside the media library, or a card that cannot be made (file deleted, binding missing, as with `ALOHA_IMAGES=origine` on an account without Cloudflare Images) falls back to `/og/default.jpg`.

## The edit bar, on the site

For a signed-in editor, EmDash adds its "EmDash | Edit" bar to every page rendered on demand (option `toolbar`, "server" by default; code in `emdash/dist/astro/middleware/request-context.mjs`). What it does, read in the code of 0.38:

- **Switching "Edit" on** sets the cookie `emdash-edit-mode=true` and reloads. Edit mode needs the cookie AND a session of role 30 (Editor) or above: a visitor who forges the cookie gets nothing. In that mode `getEmDashCollection` and `getEmDashEntry` read the database without cache and put an `edit` proxy on every entry (`createEditable`); outside it, a silent proxy (`createNoop`) that writes no attribute.
- **The bar only reads the HTML**: the tags marked `data-emdash-ref`. The FIRST one on the page gives the status ("Published", "Unpublished changes"), the "Publish" button and the link to the back office. On a click it walks up to the first annotated parent that names a field and acts on the kind the manifest (`/_emdash/api/manifest`) gives that field: `title` (string) is edited in the page; `cover` (image) opens EmDash's picker (replace, upload, remove); `description` (text, which the manifest lists as richText) opens the back office at that field, in another tab.
- **Saving is not publishing.** Each change goes out as `PUT /_emdash/api/content/posts/<id>`; the collection keeps revisions, so the engine stores a draft and the public site does not move. "Publish" (`POST .../publish`) puts it online and reloads the page.

The theme turns every entry into an entry of the `posts` collection (`src/moteur/source.emdash.ts`), and that conversion dropped the proxy: no tag carried the attribute and "Edit" did nothing (measured on 24 September 2026: 44 pages in edit mode, zero attribute). The proxy now travels with the post, in edit mode only, and `annotation(post, field?)` from `@moteur/source` returns the attribute to spread on the tag (`src/moteur/annotations.ts`, checked against the package's real proxies by `annotations.selfcheck.ts`):

| Where | The entry | The fields |
|---|---|---|
| Post page | the header (`data-slot="post-hero"`), first annotated tag | `title` (h1), `description` (standfirst), `cover` (lead image) |
| Post cards (home, blog, topics, authors, keep reading) and the featured post | the card (`<article>`) | `title` |
| Search results | the result link | `title` |
| Previous and next post, under a post | the link | `title` |
| Every written section (since 3.3.0, see "The page texts") | its `<section>` or its block; on each page the first section comes before any card | `title`, `accent`, `eyebrow`, `cta`, `cta_secondary` edited in the page; `lede`, `note`, `meta_description`, `arguments`, `revised` open the back office at the field |

Engine off, `annotation()` returns an empty object and the static build does not change by a byte. Engine on, an anonymous visitor gets the HTML from before, byte for byte.

**What the bar does not do, and why.**

- **The body is not annotated, and does not need to be.** The bar leaves Portable Text to `InlinePortableTextEditor`, EmDash's React (TipTap) island, which EmDash's own `<PortableText>` mounts in edit mode. Reef renders the body with that component (`src/moteur/TexteRiche.emdash.astro`), so in edit mode the island is already there (seen in Chromium) and saves its own draft on blur; an annotation on the body would only draw a second frame.
- **A draft does not show in the lists.** EmDash's lists render the published version, even in edit mode: after a save, the cards keep the old title, with "Unpublished changes" and "Publish". The post page itself shows the draft. Publishing shows it everywhere.
- **On the home page and the lists**, the first annotated tag is the first section (the hero, the header of the list): the status, the "Publish" button and the link of the bar are those of that section. A card's own entry still carries its post. On a topic page only the eyebrow is a section text (the title is the topic's name); an author page has no section text but its breadcrumb, and its first annotated tag is the first card.
- **A text shared by two places is edited where it lives**: the eyebrow of the filmed sequence is the one of the about page, and the eyebrow of privacy and terms is the one of the legal notice; the attribute names that entry.
- **The standfirst and the cover of a card are not annotated**: the title's link covers the card with a pseudo-element, so a click there reaches the title, which the bar edits.
- **An annotation goes on a tag that already has a class.** Astro gives its scope class (`class="astro-..."`) to a classless tag that receives a spread in a component with a `<style>`, even when the spread object is empty, and that for every visitor.
- **The bar speaks English**: its words are written in its script, outside the catalogue the theme completes.

## The page texts

Until 3.3.0 the posts came from the database but the text a reader sees first on the home page and on the fixed pages (the hero title, its standfirst, the buttons, the section headers) came from the dictionary of the files (`src/i18n/`, `src/config/legalData.json.ts`): an editor switched "Edit" on and could change nothing there. Since 3.3.0 every written section of a page is an entry of the `sections` collection ("Textes des pages" in the back office), under the same identifier in both languages, 26 entries per language:

| Page | Sections | Fields |
|---|---|---|
| Home | `hero`, `a-la-une`, `studio` (the filmed sequence), `dernieres-notes`, `sujets`, `signatures`, `lettre-flux` | eyebrow, title, accent word, standfirst, buttons; for `hero` also the three ledger labels and the search title and description |
| Every page | `lettre` (the newsletter block, home band and footer), `pied-de-page` (the footer line) | title, accent word, standfirst, button, note |
| Post | `a-lire-ensuite` (keep reading) | title, accent word, standfirst, button |
| Blog, topics, authors, search | `archives`, `rubriques`, `auteurs`, `recherche` | eyebrow, title, accent word, standfirst, search title and description |
| About | `a-propos`, `a-propos-histoire`, `a-propos-regles`, `a-propos-signatures`, `a-propos-appel` | the same, plus the three paragraphs of the story and the three rules (repeated field `arguments`) |
| Contact | `contact`, `contact-formulaire`, `contact-direct`, `contact-suite` | the same, plus the note and button of the form and the three next steps |
| Legal notice, privacy, terms | `mentions-legales`, `confidentialite`, `conditions` | title, description, clauses (`arguments`), and the revision date of privacy and terms |

How it is wired: `src/moteur/contenu.sections.ts` is the only table between the dictionary and the collection (for each entry, the path of every text it carries). `lireLaPage(locale)` from `@moteur/source` reads the published sections once per request and lays them on the dictionary of the files (`src/moteur/contenu.ts`), so the result has the exact shape of the dictionary and no component reads the database. The page calls `textesDeLaPage(Astro)` (`src/moteur/textes.ts`), which puts the texts and the edit proxies on `Astro.locals`; a component reads its copy with `useTranslations(Astro)` and its attributes with `annotationsDe(Astro, slug)`. Engine off, the texts are the files and nothing is annotated.

The rules:

- **A missing or unpublished entry, or an empty field, keeps the text of the files.** A section cannot be removed from the page, only rewritten. The `arguments` of an entry replace the list of the files (an empty list keeps it).
- **The seed carries the exact texts of the files**, both languages (`seed/seed.json`, written by `node scripts/graine-sections.mjs`). `src/moteur/contenu.selfcheck.ts` (`pnpm test`) fails when a path of the table is missing from a dictionary, a field from the seed, or when the seed and the files disagree: change a text of the dictionary, run the script.
- **What stays in the files, on purpose**: the labels of the interface (menu, footer columns, form fields and placeholders, pagination, empty states, templates with a token such as "{count} posts" or "Posts filed under {topic}"), the topics and the authors (their names, descriptions and bios are the content collections of `src/data/`, which the engine does not manage), the 404 page (prerendered), and the revision date of the legal notice (a constant in `legal.astro`). The breadcrumb label and the title in the head follow the section's search title (`meta_title`), edited in the back office.
- **Contact, legal notice, privacy and terms are managed pages since 3.3.0**, rendered on demand like the others, so that a published section shows with no build.

### Where the database gets them

- **A new site**: the setup wizard (with its demo content) or, locally, `/_emdash/api/setup/dev-bypass` apply the seed with its content: the 52 entries are created and published.
- **A site deployed before 3.3.0** (the live demo was deployed with 3.1.3): its database has no `sections` collection. Nothing breaks: `lireLaPage` logs the error and the pages keep the texts of the files. `seed/import-3.3.0-reef.sql` creates the collection once, and touches nothing else:

```bash
npx wrangler d1 execute reef-moteur --remote --config wrangler.moteur.jsonc --file=seed/import-3.3.0-reef.sql
```

Its first part was not written by hand but read from what EmDash 0.38 itself writes: a blank local database, the seed of 3.1.3, then the seed of the collection through the same door, and the difference read with sqlite on the local D1 file. Its second part carries the corrections of 3.3.0 to texts that also live in the database, on the published rows and on their revisions, found by slug and language: the host clause of the legal notice, and the privacy policy and terms rewritten for a blog (title, standfirst, clauses, revision date). A single clause is replaced by its exact fragment; a rewritten list or a field only while it still holds the text of the earlier seed, so a text rewritten since in the back office is left alone. It is idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`, `UPDATE` guarded by `instr` or by the old value): a second run changes nothing. It assumes the database has no `sections` collection created another way (by the seed of a new site, whose identifiers differ); such a database already has the texts of the seed, and only needs the second part.

## The back office

The administration is EmDash's own React application. Reef does not copy it: it pushes it as far as what it exposes allows.

- **The skin: accent, fonts, logo, site name, and nothing else.** House rule of 23 September 2026: every back office keeps EmDash's two native backgrounds, white in light mode and black in dark mode. `src/moteur/habillage.ts` is a middleware that adds one `<style>` to the admin page: the theme's fonts, the variables of `tokens.css` read as is (`@theme` becomes `:root`, `.dark` becomes the admin's `data-mode`, and a `.dark` rule that paints something stays on the site), then `src/moteur/back-office.css`, which only gives EmDash's brand variables (`--color-kumo-brand`, `--text-color-kumo-link`, `--color-kumo-focus`) the theme's accent. Canvas, rail, cards, fields, hairlines and base ink are the engine's own, in both modes; the logo and the site name pass through `admin` in `moteur.config.mjs`. Buttons and one-line fields keep their pill shape, headings take the display font, the focus ring is the accent, the primary button carries the theme's ink on its primary. Measured on the production build served locally, 1440 px, pixels of the rendered page: light `#ffffff` (canvas `oklch(0.9875 0 0)`, cards `#ffffff`), dark `#0f0f0f` (canvas `oklch(0.10 0 0)`, cards `oklch(0.17 0 0)`), chroma zero everywhere. Accent against those surfaces: white on `#147ea0` 4.64 to 1, `#10657f` links on white 6.58; in dark mode `#0a0f17` on `#3fc0e0` 8.99, `#3fc0e0` links on `#0f0f0f` 8.97. All above WCAG AA.
- **The language: French, entirely.** EmDash 0.38 ships its administration in 28 languages and picks one per request: the `emdash-locale` cookie (the person's own choice, made in the language selector of the login page or the settings), then the browser's `Accept-Language`, then English. Reef sets French as the site default rather than leaving it to the browser: `src/moteur/langue-bo.ts` adds the cookie to a request that has none and sets it for the next ones. `ALOHA_BO_LANGUE` stays the lever - a language code (`ALOHA_BO_LANGUE=en`) changes that default, `ALOHA_BO_LANGUE=navigateur` gives the browser the decision back - and each person still overrides it in their settings.
- **The catalogue, completed.** EmDash's French catalogue holds 2428 messages, but 678 of them are still word for word the English source: the newest screens (media cropping and folders, tables, passkeys, scheduled publishing, the plugin registry), plus a few labels of the rail. "Widgets" and "Publish now" were among them. `src/moteur/catalogue-bo.ts` is aliased onto `@emdash-cms/admin/locales`, the module the admin page reads its catalogue from, and returns EmDash's catalogue completed by the theme's dictionary (`catalogue-bo.fr.ts`). It only fills what EmDash leaves in English and never contradicts a message EmDash has translated, with one written exception: "widget" becomes "encart" everywhere, because the house does not leave an English label in a French editor's rail. `catalogue-bo.selfcheck.ts` reads the real catalogues of the installed package and fails if a single message EmDash leaves in English is not covered, or if an entry of the dictionary no longer matches anything (an EmDash update that rewords or translates a message). Measured on the production build, 23 September 2026: of the 2327 simple messages the rendered admin page carries, 98 are still the English string, and all 98 are spellings French shares (GitHub, CSS, Python, Image, Sections, Version). `ALOHA_BO_FUSEAU` (default `Europe/Paris`) sets the time zone of the times the house extensions display, whose own texts have two dictionaries, French and English.
- **The dashboard card.** `src/moteur/accueil/` is a second house extension, whose `admin.widgets` entry adds a full-width card to the dashboard: the last published content (with a link to its editor), the version and build time served (the same values as `/version.json`), and two shortcuts, "View the site" and "Deploy everything". It is the only React component the theme adds to the admin (`carte.ts`, written with `createElement`, no JSX and no island on the public site); its data comes from a plugin route (`etat`) that reads the content through `ctx.content`. Why a second extension: an extension with React components only shows its pages in the menu when it has a page component, so mixing it with the Block Kit page of "Deploy everything" would have hidden that page.

## Deploying

`wrangler.moteur.jsonc` describes the Worker: database `DB`, media `MEDIA`, the `IMAGES` binding (on-demand image optimisation, see `ALOHA_IMAGES` in `moteur.config.mjs`), and a cron every minute for scheduled publications. See `DEPLOY.md`, "First deployment of the engine", for the exact commands, from the empty account to the first import.

```bash
pnpm build:moteur
npx wrangler deploy --domain blog.example.com   # never --config: see DEPLOY.md
```

With the engine on, `/secret-spot/`, `/fr/secret-spot/` and `/_emdash/secret-spot/` answer a 302 to `/_emdash/admin` (`src/worker.moteur.ts`): one back office per site, EmDash's, at the same address as every other back office of the house. The Git-based editor of 2.3 was removed in 3.3.0.

The Worker also settles a few addresses before EmDash sees them (`src/worker-adresses.ts`, shared with the static Worker): `/sitemap.xml` answers a 301 to `/sitemap-index.xml`, any other unknown `/sitemap*.xml` a 404 (EmDash's own sitemaps, which duplicate ours, are never reached); a page asked without its trailing slash a 301; a missing page the 404 of the language of the address (`404.html`, `fr/404.html`), with the 404 code even when asked by its own address (`assets.run_worker_first` in `wrangler.moteur.jsonc` hands `/404` and `/fr/404` to the Worker); and the `Server-Timing` header EmDash sets on every answer is removed, since it describes the engine's internals. `robots.txt` disallows `/_emdash/`.

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
{ "version": "3.3.0", "construit": "2026-09-24T15:49:33.372Z", "moteur": "emdash" }
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

A draft answers 404 as long as it is not published.

The edit bar, 24 September 2026, same setup (production build served by workerd locally, database filled by `scripts/moteur-import.mjs`, editor session opened by dev-bypass):

- **Before**: in edit mode, 44 pages (every managed HTML page), the bar in `data-edit-mode="true"` everywhere, zero annotated tag.
- **After, anonymous visitor**: the 48 managed addresses (pages, feeds, `llms.txt`, content sitemap) identical byte for byte, zero `data-emdash-ref`; engine off, the static build identical file by file (171 files, same sha256).
- **After, edit mode**: 38 pages annotated, the first annotated tag of each one carries the entry and its status; 372 attributes (170 entries, 170 titles, 16 standfirsts, 16 covers). With the attributes removed, the HTML is the one from before, in edit mode as well.
- **In Chromium, through the bar itself**: "Edit" switches on; the title is edited in the page, Enter saves it (`PUT` 200, "Saved", "Unpublished changes") without touching the public site; "Publish" (`POST` 200) puts it online, on the post and on the blog list; back to the original title the same way. The standfirst opens the back office at `?field=description`, the cover opens the picker, the body carries EmDash's inline editor; on a list, a click on a card title edits it instead of following the link. These figures are local: online, the network and Cloudflare's edge are added, to be measured after the first deployment.

The page texts, 24 September 2026, same setup (the database of the 3.1.3 measure, then the 3.3.0 seed applied by dev-bypass: 1 collection, 12 fields, 52 published entries):

- **Engine off**: the static build identical file by file to 3.1.3 on 170 of 171 files; the 171st, a post with a code block, varies between two builds of the same 3.1.3 source too (Shiki's token colours under a loaded machine), and only there.
- **Anonymous visitor, engine on**: 58 addresses. 49 identical byte for byte, zero `data-emdash-ref`. The 8 fixed pages now rendered on demand (contact, legal notice, privacy, terms, both languages) are identical but for one newline between two inlined stylesheets (Astro joins them with a newline when it prerenders, without when it renders on demand). The content sitemap gains those 8 addresses; `/sitemap-index.xml`, which the sitemap integration no longer writes (no indexable page is prerendered any more), is served on demand and names the content sitemap (`src/moteur/plan-du-site.index.ts`).
- **Edit mode**: 52 pages annotated, the first annotated tag of each is an entry (a section, or the post on a post page); 1110 attributes: 176 section entries and 562 section fields, 170 post entries and 202 post fields. On the home page, 9 sections and 34 fields. Each of the 96 texts edited in the page on 8 pages (both homes, about, contact, legal notice, privacy, blog, topics) shows exactly the value the API returns, so a save without a change writes the same text back.
- **In Chromium, through the bar**: on the home page the first annotated tag is the `hero` entry ("Published"); the hero title is edited in the page, Enter saves it (`PUT` 200, "Saved", "Unpublished changes") while the public page keeps the old title; "Publish" (`POST` 200) puts it online, `/fr/` keeps its French title; the original title came back by the same path.
- **The SQL file**, applied with `wrangler d1 execute --local` to a copy of the 3.1.3 database: the result equals the one of the seed, table by table (the stored text of 17 index statements differs only by the trailing whitespace Wrangler trims); applied a second time, nothing changes; applied twice to the database with the imported posts, the posts are untouched and 26 sections per language are published.

The finishing of 3.3.0, 24 September 2026, same setup (production build served by workerd locally, the database of the page-texts measure). Engine off: 171 files before, 162 after (the Git back office's pages and scripts, ten files, gone; `fr/404.html` added). Once the three changes every page carries are set aside (the footer loses the "Editorial workspace" link and, next to the demo line, the "theme by Example Studio" credit; the inlined stylesheet loses the utilities only the Git back office used; the share card's alternative text describes the photo, in the page's language), 15 files differ, each for a fix of the audit: `robots.txt` (`Disallow: /_emdash/`), `404.html` (no canonical, hreflang or `og:url`, "Three ways back"), the legal notice, privacy and terms of both languages, the six author pages (no placeholder links, so no "Elsewhere" block) and `fr/rss.xml` (French title). Engine on, 76 addresses: after the same three changes, only the 404 pages, `/about` (301 to `/about/`, before 200), the six author pages, the legal pages (from the database, after the second part of the SQL file), `fr/rss.xml`, `robots.txt` and the sitemap addresses differ. The answers: `/sitemap.xml` 301, `/sitemap-0.xml`, `/sitemap-1.xml`, `/sitemap-contenu-1.xml` 404 (before: 200, 500, 500, 500), `/404` and `/fr/404/` 404 (before: 200 and the English page), `/fr/nope/` the French 404, `Server-Timing` on none of the 76 answers (before: 70), the login page "Reef Admin" with no em dash (the catalogue self-check fails on one). Edit mode: 52 pages annotated, 1110 attributes, page for page as before. The SQL file, applied twice with `wrangler d1 execute --local` to a 3.1.3 database: the 52 sections equal the 3.3.0 seed, field for field and in their live revisions, and the second run changes nothing but D1's own change counter; its second part, applied twice to the 3.3.0-seeded database, the same. In Chromium, through the bar: the hero title edited, saved (`PUT` 200), published (`POST` 200), seen anonymously, then restored the same way; the anonymous pages are again identical to the byte.
