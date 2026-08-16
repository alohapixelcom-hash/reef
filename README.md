<!-- README.md - the sales page of the repo: what Reef is, what it contains, how to run it, what to do before deploying. -->

# Reef

A blog theme for Astro 7, by Aloha Pixel. One repository gives you the whole
front of a writing publication: a home that leads with the latest piece, a
paginated blog, topic and author pages, a reading column with a table of
contents, and a per-language RSS feed. In English and in French, from the same
source.

The demo publication is Reef Notes, a fictional two-person web studio's
notebook: build logs, type specimens, and the unglamorous half of freelancing.
Every word lives in a typed dictionary or in a Markdown post, never inside a
component.

Reef is built to be read. Buyers get clean, commented, strictly typed source
with a maintained wiki and agent tooling, not a black box.

## What is in the box, counted from this repo

Numbers below were counted from the source, not estimated (snapshot
2026-08-15; `pnpm build` green, `pnpm check` clean).

| What | Count |
|---|---|
| Pages emitted by `pnpm build` | 55 |
| Plain-text endpoints | robots.txt, llms.txt, per-language rss.xml, sitemap-index.xml |
| Content collections (zod validated) | 3 (posts, authors, topics) |
| Demo content entries | 9 posts, 3 authors, 5 topics, in 2 languages |
| UI primitive families (src/components/ui) | 36, across 63 .astro files |
| Primitive files that need a script tag | 10 of 63; the rest are pure HTML and CSS |
| Section components | 22 |
| Original hand-drawn icons | 60 |
| animate-* utilities (motion catalog + brand tokens) | 55 + 3 |
| Languages, from one page source each | 2 (English at the root, French under /fr/) |
| Runtime dependencies | 10, every one listed in THIRD-PARTY.md |

## Why it feels expensive

- **Almost no JavaScript.** Dialogs are native `<dialog>`, accordions are
  native `<details>`, the marquee is pure CSS. The scripts that ship are the
  mobile drawer, the theme switch, the shrinking navbar and the reader's table
  of contents, and all of them survive view transitions.
- **A design system, not a stylesheet.** One file (src/styles/tokens.css)
  defines the palette, semantic roles and generated utilities. Markup only
  speaks roles (bg-primary, bg-card, text-muted-foreground), so
  `pnpm rebrand "#yourhex"` repaints the theme, the favicon and the share
  cards from a single colour.
- **An owned SEO layer.** Canonical, Open Graph, JSON-LD builders, robots.txt,
  llms.txt, a per-language RSS feed and the sitemap are hand-written, readable
  files in the repo, not a plugin.
- **Two themes, not one switch.** Semantic tokens invert under one `.dark`
  class, applied before first paint, with zero flash. Light and dark do not
  share a shadow recipe: dark swaps cast shadows for luminous borders.
- **Bilingual by construction.** One page source per route, one output per
  language, one post file per language under the same slug. The dictionary is
  a typed object, so a missing French key is a build error, not a silently
  English sentence in production.
- **Accessibility as a feature.** 44px touch targets, correct aria wiring,
  visible focus everywhere, and reduced motion honored at both the CSS and the
  scroll-timeline layer.

## Stack

Astro 7 (static output, no adapter), Tailwind CSS 4 (CSS-first, no config
file), tailwind-variants, @astrojs/mdx (Markdown and MDX posts) and
@astrojs/sitemap, self-hosted fonts via Fontsource (Space Grotesk, Instrument
Sans, Besley, all OFL). Node >= 22.12 and pnpm. No React, no
animation library, no WebGL.

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:4321
```

All commands:

```bash
pnpm dev          # dev server
pnpm build        # static site into dist/
pnpm preview      # serve the build locally
pnpm check        # astro check (types and templates)
pnpm rebrand "#7a59ff"   # repaint the theme from one brand color
pnpm rebrand --restore   # back to the Reef palette
pnpm og           # regenerate the Open Graph cards in public/og/
pnpm app          # build tuned for a native Capacitor shell

# selfchecks, plain Node, no framework:
node src/js/schema.selfcheck.ts
node src/js/pagination.selfcheck.ts
```

## Structure

```text
src/
  components/
    ui/         36 primitive families (button, dialog, tabs, reveal, ...)
    Sections/   22 sections, grouped by page (Home/, Post/, Archive/, Search/, Global/, Legal/)
    svg/icons/  the 60-icon original set
  config/       typed site data: siteData, navData, legalData
  content.config.ts  the posts, authors and topics collections, zod schemas
  data/         your content: posts (Markdown/MDX), authors and topics (JSON)
  i18n/         the bilingual layer: config, helpers, en/ and fr/ dictionaries
  js/           pure logic: JSON-LD builders, pagination, text utils
  layouts/      BaseLayout + BaseHead (the entire <head>, hand-written)
  pages/        [...locale]/ (index, blog, topics, authors, about, contact, legal), 404, robots, llms, rss
  styles/       tokens.css, global.css, prose.css, the motion catalog
scripts/        rebrand.mjs, og.mjs, app.mjs
wiki/           how the theme works, anchored to the code
.claude/        rules and skills for coding agents
```

## Make it yours, in order

1. **src/config/siteData.json.ts**: name, title, description, author. This is
   the only file you must edit to change the publication identity.
2. **astro.config.mjs**: set `site` to your production URL. It feeds canonical
   URLs, OG tags, the sitemap, robots.txt, llms.txt and the RSS feed at once.
3. `pnpm rebrand "#yourbrandcolor"`, then `pnpm og` to repaint the share cards.
4. **src/data/**: replace the demo posts, authors and topics. One Markdown post
   per language under the same slug.
5. **src/i18n/ui/en/** and **src/i18n/ui/fr/**: all the interface copy. Nothing
   displayed lives in a component.
6. **src/config/navData.json.ts** and **legalData.json.ts**: your links and the
   legal page, with bracketed fields.

## Before you deploy

- [ ] `site` in astro.config.mjs points at your real domain.
- [ ] `pnpm og` ran after your rebrand, so the cards in public/og/ carry your
      colors and not Reef Notes'.
- [ ] Legal copy in src/config/legalData.json.ts reviewed by a human who may
      legally have an opinion; it ships as a generic starting point, in both
      languages, and neither is legal advice.
- [ ] The demo posts, authors and topics replaced with your own.
- [ ] The contact form points at your own endpoint, or is removed. It ships
      with no `action` on purpose (the note is at the top of contact.astro).
- [ ] `pnpm check` and `pnpm build` are green, and the selfchecks pass.

Deploy dist/ to any static host: Cloudflare Pages, Netlify, Vercel, an nginx
box. No adapter, no server, no environment variable required.

## Ship it as a native app (Capacitor)

Reef builds to plain static files with no server, no external CDN and local
fonts, which is exactly what Capacitor wraps. Every fixed element respects
`env(safe-area-inset-*)`, viewport heights use `svh` and never `vh`, touch
targets are 44px, and no page overflows horizontally at 390x844.

```bash
pnpm app          # build tuned for a native shell
npx cap add ios
npx cap sync
npx cap open ios
```

`capacitor.config.ts` ships with the theme. The full guide, including the
checklist Apple reviewers care about, is in
[wiki/subsystems/mobile-app.md](wiki/subsystems/mobile-app.md).

## Documentation

- AGENTS.md: the operating manual (conventions, commands, gotchas), binding
  for humans and agents alike.
- .claude/rules/: the five house rule files (astro, tailwind, typescript,
  motion, seo), each anchored to real files in this repo.
- .claude/skills/: `aloha-review` (the quality bar) and `wiki` (the knowledge
  base maintainer).
- wiki/: start at wiki/overview.md; each subsystem has its own anchored page.
- THIRD-PARTY.md: the complete honest inventory (three OFL fonts, permissive
  npm packages, zero stock assets).

## License

Commercial license, full text in LICENSE. In short: one license per developer
who edits the source; build unlimited commercial end products for yourself or
clients; modify anything; no attribution required. The one prohibition:
redistributing Reef itself, modified or not, as a theme, starter, template,
kit or component library, or publishing its source. Provided as is, without
warranty.
