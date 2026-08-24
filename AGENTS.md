<!-- AGENTS.md - the guide for coding agents working in this repo: stack, structure, conventions, commands, gotchas. -->

# Working in Reef, as an agent

Reef is a commercial Astro theme. Buyers read the source; every file you
touch is part of the product. This page is the operating manual. The five
rule files it imports are binding, not advisory:

- docs/conventions/astro.md - pure .astro, platform first, static only
- docs/conventions/tailwind.md - the token contract, what markup may write
- docs/conventions/typescript.md - strict types, selfchecks, derived types
- docs/conventions/motion.md - the animation ladder and reduced motion
- docs/conventions/seo.md - BaseHead, JSON-LD constructors, endpoints

Two things carry the rest of the context. The review checklist at the end
of docs/design.md, which you run on your own work before calling it done.
And the wiki in wiki/, which explains how each subsystem actually works:
start with wiki/overview.md, and add a sync entry there after a structural
change.

## What this theme is

A blog, free, in English and in French: a home that leads with the latest
piece, a paginated blog, topic and author pages, a reading column, and a
per-language RSS feed. The content is three Astro content collections (posts,
authors, topics) with zod schemas. There is no shop, no pricing, no CMS and no
server. The demo publication is fictional and named **Reef Notes**; the theme
is named **Reef**. A buyer replaces Reef Notes and keeps Reef.

## Stack

Astro 7 (static output, no adapter), Tailwind CSS 4 (CSS-first config, no
tailwind.config.js), tailwind-variants, @astrojs/mdx (Markdown and MDX posts)
and @astrojs/sitemap, Fontsource for Space Grotesk and Instrument Sans (the
only two fonts: the accent word keeps the heading font under a coral wave
underline). Node >= 22.12, pnpm. Demo copy is bilingual, for a fictional
publication named Reef Notes.

**No React, no WebGL, no animation library.** Reef has zero islands and nine
runtime dependencies. Every effect on the page is CSS. Adding a framework to
this repo is a design failure, not a feature.

## Structure

```text
src/
  components/
    Sections/   22 sections (Home/, Post/, Archive/, Search/, Global/, Legal/)
    svg/icons/  60 original icons, name union derived from icons.ts
    ui/         36 primitive families, see ui/README.md (the contract)
  config/       siteData, navData, legalData; types in config/types/
  content.config.ts  the posts, authors and topics collections, zod schemas
  data/         posts/ (Markdown/MDX), authors/ and topics/ (JSON), en/ + fr/
  i18n/         config, helpers, and the en/ + fr/ dictionaries
  js/           pure logic + selfchecks (schema, pagination, textUtils)
  layouts/      BaseLayout (html shell) and BaseHead (the whole <head>)
  pages/        [...locale]/{index,blog,topics,authors,about,contact,legal},
                404, robots, llms, rss
  styles/       tokens.css (design system), global.css, prose.css, motion/
scripts/        og.mjs (OG cards), rebrand.mjs (repaint), app.mjs (Capacitor)
wiki/           the maintained knowledge base
```

Import through aliases (tsconfig.json): @components/*, @config/*,
@layouts/*, @styles/*, @js/*, @i18n.

## Commands

```bash
pnpm dev        # dev server
pnpm build      # static build into dist/ (55 pages when green)
pnpm preview    # serve dist/
pnpm check      # astro check; must be 0/0/0 before you finish
pnpm rebrand "#7a59ff"   # repaint tokens.css from one brand color
pnpm og         # regenerate public/og/*.png from the tokens

# selfchecks (no test framework, plain Node):
node src/js/schema.selfcheck.ts
node src/js/pagination.selfcheck.ts
```

## Non-negotiable conventions

1. Every file starts with a one-line comment: its path and its role.
2. No file exceeds 400 lines.
3. No em dashes, no en dashes, anywhere: code, comments, copy, docs. Plain
   hyphens only.
4. Code comments are in French **without accents**. Displayed copy is in the
   dictionary, with accents, and never in a component.
5. Markup uses semantic tokens only (bg-background, text-foreground,
   bg-card, bg-primary, text-muted-foreground, border-border, bg-surface,
   text-accent, ring-ring). Palette names (ink-*, coral-*, reef-*) and raw
   hex never leave src/styles.
6. Zero JavaScript by default. Native `<dialog>`, `<details>`, anchors and
   CSS before any `<script>`. There is no React and no island in this theme.
7. Buttons are pills (rounded-pill). Cards float (bg-card rounded-card
   shadow-float). Sections breathe (py-24 md:py-32). Exactly one accent-script
   word per big title: it keeps the heading font, turns coral and carries the
   coral wave underline (--accent-wave). Never an italic serif.
8. Bilingual is mandatory: `export const getStaticPaths = localePaths;` on
   every page under [...locale]/ (dynamic routes multiply it), every internal
   href through `localizePath()`, and the French is written, not translated. A
   post exists twice, under the same slug.
9. Accessibility is part of done: 44px touch targets, correct aria, alt
   everywhere, visible focus, reduced motion respected at both layers.
10. New third-party anything (package, font, asset) gets a THIRD-PARTY.md
    entry in the same change. Photos and icon libraries do not enter at all.

## Gotchas that have already bitten

- View transitions re-run nothing: a naive inline script executes once and
  dies on the next navigation. Use the established patterns (re-init on
  astro:page-load with a data-*-ready guard, document-level delegation, or
  astro:after-swap for `<html>` state). See docs/conventions/astro.md.
- astro:after-swap replaces `<html>` attributes with server-rendered ones;
  ThemeInit re-applies .dark for that reason. Do not "simplify" it away.
- assetsInlineLimit: 0 in astro.config.mjs is load-bearing (scripts must
  stay addressable across view transitions). Leave it.
- Tailwind 4 has no config file. New tokens go in tokens.css; new utilities
  are declared with @utility (see src/styles/motion). Do not create
  tailwind.config.js; do not use @apply with palette names.
- The `dark:` variant is bound to the .dark class via @custom-variant in
  global.css. Components written with semantic roles rarely need `dark:` at
  all; needing it for a color role means the token layer is the fix.
- **The theme does NOT follow the system colour scheme.** ThemeInit reads
  `localStorage` (key "reef-theme") and falls back to dark, on purpose. A
  screenshot in light mode needs the key set to `light` before first paint.
- trailingSlash is "always": internal hrefs end with /, and paginated list
  URLs come from the pagination helper (src/js/pagination.ts), not string
  concatenation.
- The scroll-driven utilities (animate-scroll-*) need their local
  reduced-motion guard because view() timelines ignore the global collapse.
  Never strip the double @media/@supports nesting in motion/scroll.css.
- The contact form (contact.astro) ships with no `action`, on purpose.
  Wiring it to an endpoint is the buyer's documented decision, not a fix.
- Draft posts build (for preview) but must stay out of lists, RSS and
  llms.txt: filter with data.draft !== true, like the existing readers.

## Definition of done

`pnpm check` at 0 errors, 0 warnings, 0 hints, `pnpm build` green with 55
pages, the selfchecks passing, no em dash anywhere, no file over 400 lines,
the review checklist at the end of docs/design.md passed (or you fixed
what it found), and if the change was structural, the wiki got a sync
entry. Then, and only then, the task is finished.

## The design doctrine

Before adding a section, a colour, a typeface or an effect, read
docs/design.md. It is the house position: what it refuses, what it does
instead, and why. The checklist at the end of that file is run before every
release.
