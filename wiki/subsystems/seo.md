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
  - astro.config.mjs
  - src/i18n/index.ts
updated: 2026-08-15
---

# SEO layer

No SEO package is installed. The layer is four hand-written pieces: a head
component, a set of JSON-LD constructors, three text endpoints, and an OG
image generator. The single source of the production origin is `site` in
astro.config.mjs:10; everything below derives absolute URLs from it.

The site is bilingual, so every tag below has a language dimension:
hreflang alternates, `og:locale`, a per-language RSS feed and the sitemap's
`xhtml:link` entries all come from `getAlternates` in src/i18n/index.ts.
See [i18n.md](i18n.md) for the contract.

## BaseHead (src/layouts/BaseHead.astro)

One component writes the entire `<head>`:

- Title policy at :41 ("Title | Brand" unless the brand is already in the
  title), description defaulting to siteData (:34).
- Canonical at :45-48, aligned with `trailingSlash: "always"`
  (astro.config.mjs:14); file routes keep their extension.
- Full Open Graph (:106-113) and twitter card (:120-125) blocks, with image
  alt.
- Favicon generated at build: the brand colors are regex-extracted from
  tokens.css imported raw (:21, :65-68) and injected into an inline SVG data
  URI (:71-72). A rebrand repaints the favicon with no asset to edit.
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

The sitemap integration filters /404/ and /examples/ out
(astro.config.mjs:35). A page hidden from robots should be hidden from the
sitemap too; keep them in step.

## OG images

scripts/og.mjs renders the public/og/*.png cards (1200x630) from an SVG
template whose colors come from tokens.css (og.mjs:29-31), rasterized by
sharp. `pnpm og` regenerates them; run it after `pnpm rebrand`. Pages choose
their card through the `image` prop of BaseLayout, whose shape requires alt
text (src/layouts/BaseHead.astro:27).
