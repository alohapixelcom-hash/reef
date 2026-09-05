<!-- SPEC.md - the brief for Reef: what the theme contains, how it is built, and the rules that hold it together. -->

# Reef - the brief

> Reef is the blog theme of the Aloha Pixel family, a free Astro theme,
> bilingual in English and French. This document says what the theme contains,
> how it is built, and the rules that hold it together.

## 0. This repository

Reef puts writing on display: a publication, its posts, the authors who sign
them and the topics that group them. Three typed content collections (posts,
authors, topics), posts in Markdown or MDX, an RSS feed per language, and ten
Pexels photographs (one hero, nine covers) shipped with the demo. The demo
publication is called Reef Notes and it is fictional: the user replaces Reef
Notes and keeps Reef.

The art direction is cold and made for reading: midnight-blue ink as the
neutral, reef turquoise for action, coral as a rationed second accent, Space
Grotesk for display and Instrument Sans for body text; the accent word keeps the
heading font, turns the house turquoise and carries a turquoise wave (the Aloha
Pixel mark is a wave). The theme is light by default, with a dark mode composed
rather than inverted; English holds the root, French lives under /fr/.

## 1. What the repository contains, measured

Numbers recounted from the source (`pnpm build` green, `astro check` at 0/0/0).

| Item | Count |
|---|---|
| Pages rendered by `pnpm build` | 55 |
| Content collections | 3 (posts, authors, topics), validated by zod |
| Demo content | 9 posts, 3 authors, 5 topics, in 2 languages |
| UI primitives (`src/components/ui`) | 36 families, 63 `.astro` files |
| Section components | 24 |
| Hand-drawn icons | 60 |
| `animate-*` utilities | 55 in the catalog, plus 3 brand animations |
| Languages | 2 (English at the root, French under /fr/) |
| Wiki pages | 11 |
| Convention files (`docs/conventions/`) | 5 |
| Runtime dependencies | 9, each one tracked in THIRD-PARTY.md |

## 2. The subsystems

- **CSS-first Tailwind v4 tokens**: raw palette (ink the neutral, reef the
  action turquoise, coral the second accent), then `--reef-*` semantic aliases,
  then utilities. The markup writes only a role (`bg-primary`), never a colour.
  Dark mode only reassigns level 2, and `.on-dark` repaints a dark subtree
  inside a light page.
- **Zero-JS-first primitives**: `Dialog` is a native `<dialog>`, `Accordion` a
  group of `<details>`; Escape, backdrop and exclusivity come from the
  browser. Variants in `tailwind-variants`. 10 of the 63 files carry a
  `<script>`.
- **Content collections**: posts (Markdown/MDX), authors and topics (JSON),
  glob-loaded and validated by zod, sorted by language. Draft posts build for
  preview but stay out of the lists, the RSS and llms.txt.
- **Owned SEO layer**: `BaseHead` writes meta, canonical and OG by hand,
  in-house JSON-LD builders (Organization, WebSite, Article, BreadcrumbList),
  `robots.txt`, `llms.txt` and one RSS feed per language, sitemap. Zero SEO
  package.
- **Motion catalog**: a dependency-free port, 55 `animate-*` utilities, a
  three-level `prefers-reduced-motion` guard.
- **Typed config**: site data in `satisfies` and `as const`, derived types.
- **Self-checks**: `schema.selfcheck.ts` and `pagination.selfcheck.ts`, with no
  test framework.
- **Contact form**: written in `contact.astro` but shipped with no `action`, so
  as not to impose a host or a provider on the user.

## 3. The knowledge base and the review

**`wiki/`**: a markdown knowledge base maintained alongside the code. Every page
carries a frontmatter and quotes a real `path:line`, so that drift is
detectable.

**The review**: the checklist at the end of `docs/design.md`, fifteen points to
go through before any release, with one `path:line` proof per finding.

## 4. Non-negotiable rules

- **No em dash and no en dash anywhere.** Not in the code, the comments, the
  copy or the documentation. Plain hyphens.
- **The markup writes only semantic roles**, never a palette name and never a
  hex.
- **Zero JavaScript by default**; the filter, the sort and the reading table of
  contents only hide or reorder markup already rendered by the server.
- **No React, no WebGL, no animation library.**
- **Bilingual by construction**: one source per route, one output per language;
  a missing dictionary key is a build error. A post exists twice, under the same
  slug.
- **Accessibility included in the finish**: 44px touch targets, correct aria,
  visible focus, reduced motion honoured.
- **No file goes over 400 lines**; every third-party dependency is tracked in
  `THIRD-PARTY.md` before it comes in.
