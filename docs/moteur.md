<!-- docs/moteur.md - the optional publication engine: what it is, how it is wired, how to run it and what it adds to the back office. -->

# The publication engine

Reef builds two ways, and one variable chooses.

| | Engine off (default) | Engine on (`ALOHA_MOTEUR=emdash`) |
|---|---|---|
| Posts live | in `src/data/posts/*.md` | in a database (Cloudflare D1), media in R2 |
| Publishing | commit, then build | one click in the back office, visible with no build |
| The site | static HTML, any host | a Cloudflare Worker: managed pages rendered on demand, the rest prerendered |
| The back office | none | EmDash, at `/_emdash/admin` |

Engine off, nothing of the engine enters the build: the static site is the
same as a Reef without an engine.

The engine is [EmDash](https://github.com/emdash-cms/emdash) 0.38 (MIT), a
CMS made for Astro and Cloudflare. Reef does not fork it: it plugs into it.

## Running it locally

```bash
pnpm dev:moteur                                              # http://localhost:4321, back office at /_emdash/admin
node scripts/moteur-import.mjs --url http://localhost:4321   # pours the Markdown posts into the database, once
```

On first start EmDash creates its tables and applies `seed/seed.json`: the
schema of Reef (collections, fields, taxonomies, menus) and the texts of the
pages. The posts go through the API, so each imported post passes the same
validation as a post typed by hand. The import can run again: a post already
present (same slug, same language) is skipped.

Locally, `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` opens an
administrator session without a passkey. That door exists in development
only; the session also holds for `astro preview` of the production build,
which reads the same local state (`.wrangler/state`).

## How it is wired

Six pieces, and no page knows where a post comes from.

1. **`moteur.config.mjs`** adds the Cloudflare adapter, React (the back office
   interface), EmDash and the house extensions, only when the variable is set.
   It reads the list of managed pages from `src/moteur/pages-gerees.mjs`: those
   are rendered on demand, every other page stays prerendered.
2. **The `@moteur/source` alias** points to `src/moteur/source.fichiers.ts` or
   `src/moteur/source.emdash.ts`. Both export the same functions
   (`billetsPublies`, `billetParSlug`, `corpsDuBillet`) and return the same
   shape: an entry of the `posts` collection. No component knows the
   difference.
3. **`src/js/posts.ts`** is the only place that lists posts. It reads the
   source through the alias; sorting, references and reading time hold for
   both.
4. **`src/moteur/chemins.ts`**: a page rendered on demand receives no props.
   `propsDeLaPage(Astro, getStaticPaths)` replays the page's own
   `getStaticPaths` and looks for the requested address in it: what exists at
   build time exists on demand, at the same place; any other address answers
   404.
5. **`src/js/adresses.ts`** holds the path functions of the dynamic pages
   (post, topic, author, tag), next to `cheminsArchive` in `src/js/archive.ts`.
   Each page exports them as its `getStaticPaths`, and the on-demand sitemap
   replays the same functions without importing a page: a page imported by a
   module that is not a page stops being a style boundary for Astro, and the
   theme's stylesheet would end up in the back office.
6. **`src/moteur/TexteRiche.emdash.astro`** renders the body of a post from
   the database (Portable Text) in the reading column, with the same heading
   anchors (`github-slugger`, like Astro) and the same code highlighting
   (Shiki, two themes). Tables are EmDash's `table` blocks, the ones the
   « Tableau » button of the editor inserts.

### Adding a managed page

1. Add it to `PAGES_GEREES` (`src/moteur/pages-gerees.mjs`) and to the
   `CHEMINS` table of `src/moteur/plan-du-site.ts`.
2. In the page: `const props = await propsDeLaPage<Props>(Astro, getStaticPaths); if (props instanceof Response) return props;`.
3. Read posts through `@js/posts`, never through `getCollection("posts")`.
4. Read the copy with `const t = await textesDeLaPage(Astro)`
   (`src/moteur/textes.ts`) before any component renders; components read it
   with `useTranslations(Astro)`.

A page forgotten in `PAGES_GEREES` would stay frozen on the content of the
last build. A page listed there but missing from `CHEMINS` makes the sitemap
throw, on purpose.

### Two traps

- **`/blog/2/` lands on the post route.** On demand, a named parameter
  (`[id]`) comes before a rest parameter (`[...page]`). `blog/[id].astro`
  recognises a number and renders the archive; the rendering lives in
  `src/components/Pages/`.
- **`trailingSlash: "always"` breaks the engine's API**, whose routes are
  called without a trailing slash. Engine on, the setting is `"ignore"`, and
  the Worker redirects pages to their trailing slash itself
  (`src/worker-adresses.ts`).

### Images rendered on demand

- **Every image address carries the build's quality.** On demand, the
  adapter's `/_image` address carried no `q`, and the Cloudflare Images
  binding then encodes almost losslessly. `src/moteur/service-image.ts`,
  aliased onto the adapter's service (engine on only, see
  `moteur.config.mjs`), writes the quality sharp uses at build time into
  every address; `qualite-image.selfcheck.ts` compares it with the installed
  sharp. The local emulation of the binding ignores `q`: the difference only
  shows online.
- **A post's share card is a 1200x630 JPEG made by the theme.** A cover in the
  media library is a WebP of any size and shape, and EmDash's `/_image` does
  not crop media files. The route `/og/billet/<key>.jpg`
  (`src/moteur/carte-du-billet.ts`) reads the cover from storage and crops it
  with the Images binding; the post page gives that address as `og:image`. A
  post without a cover, or a card that cannot be made, falls back to
  `/og/default.jpg`.

## The edit bar, on the site

For a signed-in editor, EmDash adds its "EmDash | Edit" bar to every page
rendered on demand.

- **Switching "Edit" on** sets the `emdash-edit-mode` cookie and reloads. Edit
  mode needs the cookie and a session of Editor role or above: a forged cookie
  gets nothing. In that mode the entries carry an `edit` proxy.
- **The bar reads the HTML**: the tags marked `data-emdash-ref`. The first one
  gives the status, the "Publish" button and the link to the back office. A
  click walks up to the first annotated parent that names a field: a short
  text is edited in the page, an image opens the media picker, a long text
  opens the back office at that field.
- **Saving is not publishing.** Each change is a draft; "Publish" puts it
  online and reloads the page.

`src/moteur/source.emdash.ts` carries the proxy with each post, in edit mode
only, and `annotation(post, field?)` from `@moteur/source` returns the
attribute to spread on a tag (`src/moteur/annotations.ts`, checked against the
package's proxies by `annotations.selfcheck.ts`):

| Where | The entry | The fields |
|---|---|---|
| Post page | the header, first annotated tag | `title`, `description`, `cover` |
| Post cards, featured post, search results, previous and next | the card or the link | `title` |
| Every written section of a page | its `<section>` or its block | `title`, `accent`, `eyebrow`, `cta`, `cta_secondary` in the page; the other fields open the back office |

Engine off, `annotation()` returns an empty object; engine on, an anonymous
visitor gets no attribute at all.

What the bar does not do: the body is edited by EmDash's own inline editor
(mounted by `<PortableText>` in edit mode), the lists show the published
version until "Publish", and the standfirst and cover of a card are reached
through its title.

## The page texts

Every written section of a page (the hero title, its standfirst, the buttons,
the section headers, the about, contact and legal pages) is an entry of the
`sections` collection, « Textes des pages » in the back office, under the same
identifier in both languages:

| Page | Sections |
|---|---|
| Home | `hero`, `a-la-une`, `studio`, `dernieres-notes`, `sujets`, `signatures`, `lettre-flux` |
| Every page | `lettre` (the newsletter block), `pied-de-page` (the footer line) |
| Post | `a-lire-ensuite` |
| Blog, topics, authors, search | `archives`, `rubriques`, `auteurs`, `recherche` |
| About | `a-propos`, `a-propos-histoire`, `a-propos-regles`, `a-propos-signatures`, `a-propos-appel` |
| Contact | `contact`, `contact-formulaire`, `contact-direct`, `contact-suite` |
| Legal notice, privacy, terms | `mentions-legales`, `confidentialite`, `conditions` |
| Not found | `introuvable` |

`src/moteur/contenu.sections.ts` is the only table between the dictionary and
the collection. `lireLaPage(locale)` reads the published sections once per
request and lays them on the dictionary of the files (`src/moteur/contenu.ts`),
so the result has the exact shape of the dictionary and no component reads
the database. The page calls `textesDeLaPage(Astro)`; a component reads its
copy with `useTranslations(Astro)`.

- **A missing or unpublished entry, or an empty field, keeps the text of the
  files.** A block is removed from a page with its « Masquer ce bloc » switch.
- **The seed carries the exact texts of the files**, in both languages
  (`seed/seed.json`, written by `node scripts/graine-sections.mjs`).
  `contenu.selfcheck.ts` (`pnpm test`) fails when the seed and the files
  disagree: change a text of the dictionary, run the script.
- **What stays in the files, on purpose**: the labels of the interface (form
  fields, pagination, empty states, templates with a token such as
  "{count} posts").

## The whole site from the back office

- **Menus**: `src/moteur/theme.ts` (`MENUS`) declares six native menus per
  language: `principal`, `tiroir` (added to the phone menu), `actions` (the
  "Subscribe" button), `pied-lire`, `pied-studio`, `pied-legal` (the footer
  columns). An empty or missing menu gives back the links of
  `src/config/navData.json.ts`.
- **Settings**: site name, logo, favicon, social links, title separator,
  default share image, verification codes and posts per page come from
  EmDash's settings; the per-language `site` entry carries the description,
  contact email, credit, RSS title, external form addresses, brand colour,
  typeface and logo for dark mode.
- **Topics and authors**: the `sujets` and `auteurs` collections. A post picks
  them by name (`reference` fields shown as a list of names by the
  `aloha-champs` extension); with a collection missing or empty, the files
  answer.
- **Tags**: EmDash's native `tag` taxonomy, read from each post's terms; pages
  `src/pages/[...locale]/tags/[tag]/[...page].astro`, rendered on demand and
  listed in the content sitemap. A tag keeps the same address in both
  languages (`src/js/etiquettes.ts`).
- **Blocks**: every text of the pages is a field of `sections`; blocks also
  carry button addresses, photo, video, breadcrumb name, share image, place on
  the home page and a hide switch.
- **Free pages and the not-found page**: `/<slug>/` and `/fr/<slug>/` render
  the `pages` collection (`src/moteur/PageLibre.astro`); a 404 of the Worker is
  replaced by `/404-introuvable/`, rendered from the `introuvable` block.
- **Emails and newsletter** (`src/moteur/extensions/courriels/`): the contact
  form is sent through the Worker's `send_email` binding (`EMAIL`), with its
  screens and its log. The newsletter lives in the same extension: double
  opt-in signup, confirmation and unsubscribe links (a confirmation page, and
  the one-click POST of RFC 8058 for mail apps), subscribers and sends in two
  tables, and the « Lettre d'information » screen that sends a published post
  to every confirmed subscriber. The external address of « Réglages par
  langue » is used only while emails are not connected.

## The back office

The administration is EmDash's own React application. Reef does not copy it:
it dresses it.

- **The skin: accent, fonts, logo, site name, and nothing else.** Every back
  office of the house keeps EmDash's two native backgrounds, white in light
  mode and black in dark mode. `src/moteur/habillage.ts` adds one `<style>` to
  the admin page: the theme's fonts, the variables of `tokens.css`, then
  `src/moteur/back-office.css`, which gives EmDash's brand variables the
  theme's accent. The accent keeps WCAG AA contrast on both surfaces.
- **The language: French by default.** EmDash picks its language from the
  `emdash-locale` cookie, then the browser. The Worker
  (`src/worker.moteur.ts`, rule in `src/moteur/langue-bo.regles.ts`) sets that
  cookie to French on a request that has none. `ALOHA_BO_LANGUE=en` changes
  the default, `ALOHA_BO_LANGUE=navigateur` gives the choice back to the
  browser, and each person can override it in their settings.
- **The catalogue, completed.** EmDash leaves part of its French catalogue in
  English. `src/moteur/catalogue-bo.ts` is aliased onto
  `@emdash-cms/admin/locales` and returns EmDash's catalogue completed by the
  theme's dictionary (`catalogue-bo.fr.ts`), without contradicting a message
  EmDash translated. `catalogue-bo.selfcheck.ts` reads the installed package
  and fails when a message is missing.
- **The dashboard card** (`src/moteur/accueil/`): the last published content,
  the version and build time served, and two shortcuts, "View the site" and
  « Mettre le site à jour ».

## Online

Deployment, releases and database updates: [DEPLOY.md](../DEPLOY.md).

`wrangler.moteur.jsonc` describes the engine Worker: database `DB`, media
`MEDIA`, the `IMAGES` binding (see `ALOHA_IMAGES` in `moteur.config.mjs`), and
a cron every minute for scheduled posts. The domain is on a second, light
Worker, `reef-frontal` (`wrangler.frontal.jsonc`, entry
`src/worker.frontal.ts`, module `src/frontal/`): it serves the files of
`dist/client`, the address rules and the pages already kept in the Cache API,
and wakes the engine, through the `MOTEUR` binding, only for a page not kept
yet, the back office, the API and any request with a session. The cache key
carries the content version read in the database, so a publication needs no
purge.

Locally, `npx wrangler dev -c wrangler.frontal.jsonc -c dist/server/wrangler.json`
runs both Workers in one process, after `pnpm build:moteur`.

The Worker settles a few addresses before EmDash sees them
(`src/worker-adresses.ts`): `/sitemap.xml` answers a 301 to
`/sitemap-index.xml`, any other unknown `/sitemap*.xml` a 404; a page asked
without its trailing slash a 301; a missing page the 404 of the language of
the address, with the 404 code; the `Server-Timing` header is removed.
`/secret-spot/`, `/fr/secret-spot/` and `/_emdash/secret-spot/` lead to
`/_emdash/admin`. `robots.txt` disallows `/_emdash/`.

## « Mettre le site à jour »

Publishing needs nothing more: managed pages read the database on every
request. The « Mettre le site à jour » button (back office menu, extensions)
is for the end of an editing session. It is open to the Editor role and
above, and does three things, in this order:

1. **The guard.** One build at most per minute; a refused click does nothing
   and says so.
2. **The content caches.** The object cache is emptied with EmDash's own
   invalidation, the route cache with a full purge. What is not configured is
   not emptied, and the page says so.
3. **The build of the prerendered pages**, through the Cloudflare Deploy Hook
   stored in the secret `ALOHA_DEPLOY_HOOK`:

   ```bash
   npx wrangler secret put ALOHA_DEPLOY_HOOK --config wrangler.moteur.jsonc   # online
   echo 'ALOHA_DEPLOY_HOOK=https://...' > .dev.vars                            # locally, a file git ignores
   ```

   Without it, the caches are handled and the page says the build was not
   restarted.

`/version.json` (rendered on demand, never cached) gives the version and the
build time. The page compares that time with the last trigger and says
whether the new build is online, with the last five clicks.

The extension (`src/moteur/deployer/`) is a native EmDash plugin, described
in Block Kit, engine on only; `regles.ts` holds its pure logic, verified by
`pnpm test`.

## The caches

None by default: a publication shows on the next request. Two are available,
each behind one build variable, both emptied at every publication and by the
button.

- **The object cache** (`ALOHA_CACHE_OBJETS`) keeps the database reads: `kv`
  in Cloudflare KV (with a `CACHE` binding in `wrangler.moteur.jsonc`),
  `memoire` in the process memory, for local trials.
- **The route cache** (`ALOHA_CACHE_ROUTES`) keeps whole responses:
  `cloudflare` uses Workers Cache (with `"cache": { "enabled": true }` in the
  Wrangler file); managed pages then declare `maxAge: 60, swr: 600` and carry
  the tags of their collections, which EmDash purges at every publication.
  The rules are written one pattern per language
  (`src/moteur/routes-du-cache.mjs`), and nothing under `/_emdash/` is cached.
  `src/moteur/cache-routes.ts` wraps the provider so that a purge that cannot
  run (the local workerd has no Workers Cache) is logged instead of failing
  the publication.

To check the route cache online:

```bash
curl -sI https://your-site.example/blog/ | grep -i "cf-cache-status\|cache-tag"   # twice: MISS then HIT
# publish a post in the back office, then:
curl -sI https://your-site.example/blog/ | grep -i cf-cache-status                # MISS again, the post is in the page
```
