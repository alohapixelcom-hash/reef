<!-- wiki/index.md - table of contents of the Reef wiki: every page, one line each. -->
---
title: Reef wiki
summary: Entry point of the repo's knowledge base; every wiki page is reachable from here.
sources:
  - AGENTS.md
updated: 2026-08-15
---

# Reef wiki

The map of how this theme actually works, anchored to real files with
path:line citations. When a page and the code disagree, the code wins and the
page gets fixed.

## Pages

- [overview.md](overview.md) - the architecture in one read: layers, data
  flow, build outputs, commands.
- [log.md](log.md) - the append-only journal: what changed, when, and the
  open threads.

## Subsystems

- [subsystems/tokens.md](subsystems/tokens.md) - the three-floor design
  token system, dark mode, and the rebrand pipeline.
- [subsystems/ui-primitives.md](subsystems/ui-primitives.md) - the 36
  primitive families in src/components/ui and their contract.
- [subsystems/seo.md](subsystems/seo.md) - the owned SEO layer: BaseHead,
  JSON-LD constructors, the plain-text endpoints, OG images.
- [subsystems/fluidity.md](subsystems/fluidity.md) - the gesture layer:
  springs, momentum projection, rubber-banding, translucent materials, haptics
  and the three system preferences that reshape them.
- [subsystems/motion.md](subsystems/motion.md) - the CSS motion catalog,
  reveal wrappers and reduced-motion layers.
- [subsystems/content.md](subsystems/content.md) - collections, demo data
  and the typed config layer.
- [subsystems/i18n.md](subsystems/i18n.md) - the bilingual layer: locale
  routing under [...locale], the typed dictionary, localized collections and
  the hreflang contract.
- [subsystems/mobile-app.md](subsystems/mobile-app.md) - shipping the theme
  as a real iOS and Android app with Capacitor: what is already handled,
  the commands, and the checklist before submitting.

## Reading order for a newcomer

overview.md, then tokens.md, then ui-primitives.md. Those three explain 80%
of any file you will open. The repo-level rules live outside the wiki, in
docs/conventions/ (astro, tailwind, typescript, motion, seo) and AGENTS.md.
