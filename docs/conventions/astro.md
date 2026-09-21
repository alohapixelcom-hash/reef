<!-- docs/conventions/astro.md - how Astro is used in this repo: pure .astro, platform first, static only. -->

# Astro rules

## Static output is the product

- No adapter BY DEFAULT, on purpose (astro.config.mjs). The theme compiles to
  plain HTML and imposes no host on its user. Never add an adapter, an
  endpoint that needs a server, or `export const prerender = false` to the
  theme itself.
- One opt-in exception, and it lives outside the default build: the
  publication engine (docs/moteur.md). With `ALOHA_MOTEUR=emdash`,
  moteur.config.mjs adds the Cloudflare adapter, EmDash and React, and renders
  on demand ONLY the pages listed in src/moteur/pages-gerees.mjs; every other
  page stays prerendered. With the variable absent none of those packages is
  even imported, and the build must stay identical, file by file, to what it
  was before the engine existed. A change that alters the static HTML is a
  regression, whatever it does for the engine.
- The contact form (contact.astro) ships with no `action` and no `method`: it
  is written but deliberately not wired. Keep it that way; its activation steps
  are documented in its own header.
- `trailingSlash: "always"` (astro.config.mjs:14). Every internal link ends
  with `/` (see src/config/navData.json.ts). List URLs are built with
  `buildPageHref` from src/js/pagination.ts:64, never by string concatenation.

## Zero JavaScript first

- A component is pure `.astro` until the platform genuinely runs out:
  `<dialog>` (src/components/ui/dialog/Dialog.astro), `<details>`
  (src/components/ui/accordion/AccordionItem.astro), anchors, CSS. Only 10 of
  the 63 primitive files carry a `<script>`; hold that line.
- When a script is unavoidable it is short, delegated and idempotent. The
  model is src/components/ui/_dialog.ts: one set of document-level listeners,
  a `bound` flag, shared by Dialog and Sheet.
- There is no React and no island in this theme. Adding a framework here is a
  design failure, not a feature. The publication engine's back office
  (/_emdash/admin) is a React application, but it is EmDash's page, served only
  when the engine is on: it is not an island, and the public site keeps zero.

## Scripts must survive view transitions

The ClientRouter is on (src/layouts/BaseHead.astro:130), so a page's scripts
run once and the DOM is later swapped underneath them. Every script follows
one of these proven patterns:

- Re-init on `astro:page-load`, guarded by a `data-*-ready` attribute, like
  src/components/ui/reveal/Reveal.astro:48-69.
- Document-level delegation that survives swaps by construction, like
  src/components/ui/_dialog.ts.
- Re-apply `<html>` state on `astro:after-swap`, like
  src/components/ui/theme-toggle/ThemeInit.astro:39 (the swap replaces the
  server-rendered attributes, including `.dark`).
- Clean up on `astro:before-swap` when a script holds a resource, like an
  IntersectionObserver or a listener bound to `window`.

`assetsInlineLimit: 0` (astro.config.mjs:54-57) keeps even tiny scripts as
files so they are not re-inlined and re-run unpredictably; do not remove it.

## Page assembly

Every page follows src/pages/[...locale]/index.astro: `export const
getStaticPaths = localePaths;`, then `BaseLayout` with a deliberate `title` and
`description`, JSON-LD injected through `<Fragment slot="head">` using the
constructors from @js/schema, then `Navbar`, a `<main>` of Sections, and
`Footer`. Pages compose Sections; they do not carry raw markup of their own.

## Content and imports

- Collections are defined once in src/content.config.ts with glob loaders,
  zod schemas and a validated `reference("authors")` (line 25). Drafts are
  excluded from lists with `data.draft !== true`, as in
  src/pages/[...locale]/rss.xml.ts.
- Imports use the tsconfig aliases (@components/*, @config/*, @layouts/*,
  @styles/*, @js/*; tsconfig.json:8-12). No `../../` ladders.
- Wrapper components that change tag use `Polymorphic`
  (src/components/ui/reveal/Reveal.astro:7), not string-typed `as` props.

## House constraints

One-line header comment (path + role) on every file, 400 lines maximum per
file, plain hyphens only (no em or en dashes, anywhere), code comments in
French without accents, and demo copy in the dictionary for the fictional
publication Reef Notes, in English and in French.
