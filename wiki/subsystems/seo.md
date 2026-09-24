<!-- wiki/subsystems/seo.md - the owned SEO layer: BaseHead, the JSON-LD constructors, the text endpoints and the OG pipeline. -->
---
title: SEO layer
summary: Every head tag, JSON-LD node, feed and robots directive is written by the theme itself; this page maps where.
sources:
  - src/layouts/BaseHead.astro
  - src/js/schema.ts
  - src/js/schema.selfcheck.ts
  - src/pages/robots.txt.ts
  - src/pages/llms.txt.ts
  - src/pages/[...locale]/rss.xml.ts
  - scripts/og.mjs
  - scripts/favicon.mjs
  - astro.config.mjs
  - src/i18n/index.ts
  - src/moteur/carte-du-billet.ts
  - src/moteur/plan-du-site.ts
updated: 2026-09-24
---

# SEO layer

No SEO package is installed. The layer is four hand-written pieces: a head
component, a set of JSON-LD constructors, three text endpoints, and an OG
image generator. The single source of the production origin is `site` in
astro.config.mjs:36; everything below derives absolute URLs from it.

The site is bilingual, so every tag below has a language dimension:
hreflang alternates, `og:locale`, a per-language RSS feed and the sitemap's
`xhtml:link` entries all come from `getAlternates` in src/i18n/index.ts.
See [i18n.md](i18n.md) for the contract.

## BaseHead (src/layouts/BaseHead.astro)

One component writes the entire `<head>`:

- Title policy at :41 ("Title | Brand" unless the brand is already in the
  title), description defaulting to siteData (:34).
- Canonical at :45-48, aligned with `trailingSlash: "always"`
  (astro.config.mjs:40); file routes keep their extension.
- Full Open Graph (:106-113) and twitter card (:120-125) blocks, with image
  alt.
- Favicon generated at build by scripts/favicon.mjs, which reads the brand
  colors from tokens.css and writes favicon.svg, favicon.ico (16, 32 and 48
  packed together), favicon-96.png and apple-touch-icon.png into public/.
  BaseHead only links them, and `sizes` tells the truth about each file:
  `16x16 32x32 48x48` on the ICO, `96x96` on the PNG. Google only shows a
  favicon it can crawl as a raster image; the inline SVG does not count. A
  rebrand repaints the favicon with no asset to edit.
- theme-color follows the scheme (:102-103), sitemap and RSS discovery links
  (:87-93), optional noindex (:84), ClientRouter last (:130).
- The `<slot />` at :128 receives the JSON-LD scripts from pages.

## JSON-LD constructors (src/js/schema.ts)

Six typed builders return plain objects ready for JSON.stringify:
organization (:30), website (:48), article (:72), faqPage (:105),
breadcrumbList (:126), softwareApplication (:154). This blog uses organization,
website, article and breadcrumbList; faqPage and softwareApplication ship in the
module but no page declares them. Shared behavior: `compact()` strips undefined
keys (:13-15), dates normalize to ISO 8601 (:18-20), nested Person and
Organization nodes carry no `@context`, and a price of zero survives
(:146-147). The selfcheck (src/js/schema.selfcheck.ts, 29 assertions, run
with `node src/js/schema.selfcheck.ts`) pins all of this.

Usage pattern: pages build an array of nodes and inject them through
`<Fragment slot="head">`. Placement as built: the home carries organization +
website only (index.astro), a post carries article + breadcrumbList
(blog/[id].astro), and the topic and author archives carry breadcrumbList.

## The text endpoints

- src/pages/robots.txt.ts: allow everything except `Disallow: /search/`,
  absolute sitemap URL derived from site.
- src/pages/llms.txt.ts: the site presented to language-model agents; the
  core pages (home, blog, topics, authors) plus the published posts.
- src/pages/[...locale]/rss.xml.ts: a per-language RSS 2.0 feed assembled by
  hand with minimal XML escaping, drafts excluded, deterministic lastBuildDate
  taken from the newest post.

The sitemap integration filters /404/, /examples/, /secret-spot/ and
/search/ out (astro.config.mjs), and the engine's on-demand sitemap
(src/moteur/plan-du-site.ts) excludes the same paths. A page hidden from
robots should be hidden from the sitemap too; keep them in step. Its
`serialize` hook (astro.config.mjs) re-reads the `<link rel="alternate"
hreflang>` tags of the built page in dist/ and writes those, x-default
included, as the sitemap alternates; a page without them keeps the
integration's own pairing.

## OG images

A share card is one photograph and nothing else (house rule of 23 September
2026): no gradient, title, wave or domain drawn on it, since the platform
writes og:title under the preview. scripts/og.mjs crops a theme photograph
already fetched by scripts/covers.mjs into public/og/<slug>.jpg with sharp
(1200x630, fit cover, position "attention", JPEG 86 mozjpeg 4:4:4), checks
the size, and deletes any file in public/og/ it did not make. Its CARTES table
lists only the cards a page cites: today `default` (siteData.defaultImage),
cropped from src/assets/reef-hero-vague.webp. `pnpm build`, `build:moteur`,
`app` and `predev` run it right after covers.mjs, and public/og/ is ignored by
git, so a missing photo fails the build with a message naming covers.mjs. A
post with a cover shares that cover cropped to a 1200x630 JPEG instead
(ArticlePage.astro, through `carteDuBillet` of `@moteur/source`): sharp crops
it at build time (position "attention", quality 80); with the engine on, the
route `/og/billet/<key>.jpg` (src/moteur/carte-du-billet.ts) reads it from
the media library and crops it with the Images binding, because EmDash's
`/_image` endpoint drops `fit` for media files. Pages choose
their card through the `image` prop of BaseLayout, whose shape requires alt
text (src/layouts/BaseHead.astro:27).
