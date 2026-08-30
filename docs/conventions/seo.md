<!-- docs/conventions/seo.md - the owned SEO layer: BaseHead writes every tag, @js/schema builds every JSON-LD node, zero SEO package. -->

# SEO rules

## One file owns the head

src/layouts/BaseHead.astro writes every meta, canonical, OG, twitter,
favicon and feed tag by hand. No SEO package enters this repo; if a tag is
missing, add it there, readable and diffable. BaseLayout passes its
`title/description/image/type/noindex` props straight through
(src/layouts/BaseLayout.astro:31).

- Title: `"Title | Brand"` unless the title already carries the brand, which
  the home page does on purpose (BaseHead.astro:41,
  src/pages/[...locale]/index.astro:61).
- Every page sets a written-for-humans `description`; the site-wide fallback
  (siteData.description) is for utility pages only.
- Canonical: one URL shape, derived from `trailingSlash: "always"`
  (astro.config.mjs:14) and computed in BaseHead.astro:45-48. File routes
  (rss.xml, robots.txt) keep their extension.
- The single source of the production origin is `site` in
  astro.config.mjs:10. It feeds canonical, OG, sitemap, robots.txt and
  llms.txt at once; never hardcode the domain elsewhere.

## JSON-LD: constructors only

Structured data is built exclusively with the typed constructors in
src/js/schema.ts (`organization` :30, `website` :48, `article` :72,
`faqPage` :105, `breadcrumbList` :126, `softwareApplication` :154) and
injected through the head slot:

```astro
<Fragment slot="head">
  {schemas.map((node) => (
    <script is:inline type="application/ld+json" set:html={JSON.stringify(node)} />
  ))}
</Fragment>
```

as done in src/pages/[...locale]/index.astro:66-73. Never hand-write a
JSON-LD object in a page: the constructors compact away undefined keys,
normalize dates to ISO 8601, and keep nested nodes free of `@context`. Their
behavior is pinned by src/js/schema.selfcheck.ts
(run: `node src/js/schema.selfcheck.ts`).

Placement map:

- Home: organization + website (index.astro). Organization appears once on the
  site, here. A blog home is not a sales page; it declares nothing it does not
  show.
- Blog post: article + breadcrumbList (blog/[id].astro).
- Topic and author archives: breadcrumbList.
- `faqPage` and `softwareApplication` exist in the constructors and are unused
  here. Leave them: a user who adds a pricing page should not have to write
  them.

## The plain-text surface

Three hand-written endpoints, all deriving URLs from `site`:

- src/pages/robots.txt.ts: allow all, disallow /search/, absolute sitemap.
- src/pages/llms.txt.ts: the site presented to agents; core pages plus the
  published posts.
- src/pages/[...locale]/rss.xml.ts: a per-language RSS 2.0 feed built by hand,
  drafts excluded, deterministic lastBuildDate (the newest post).

The sitemap integration filters out /404/ and /examples/
(astro.config.mjs:35). A page hidden from robots should be hidden from the
sitemap too; keep them in step.

## Images and indexing

- OG images are generated, branded, static files: `pnpm og` renders
  public/og/*.png (1200x630) from the theme tokens (scripts/og.mjs:29-31,
  SVG template at :76-106). Re-run it after `pnpm rebrand`. Pages pass their
  card via the `image` prop; alt text is mandatory in that prop's shape.
- `noindex` is a prop, not a habit (BaseHead.astro:84): draft posts and
  utility pages use it; everything else stays indexable.
