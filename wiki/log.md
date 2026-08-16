<!-- wiki/log.md - append-only journal of the wiki: dated entries, newest first, plus the open threads. -->
---
title: Wiki log
summary: Dated journal of code changes reflected in the wiki, and the list of open threads.
sources: []
updated: 2026-08-16
---

# Wiki log

Newest entry first. Every `wiki sync` appends an entry here, even when
nothing needed updating. Open threads are questions or known gaps waiting on
a decision; close them by editing this list and noting the resolution in a
dated entry.

## Open threads

- The contact form runs in demo mode by design: contact.astro ships with no
  `action` and stays that way until a buyer wires it to an endpoint. Not a
  bug; recorded so nobody "fixes" it.

## 2026-08-16 - wave accent

The accent word of headings dropped its separate font.

- The separate accent font is gone (package, import, tokens): the
  italic-serif accent word is banned across the whole family - it had become
  the marker of generated sites, not a signature.
- The accent word keeps the heading font, stays coral, and carries a coral
  WAVE underline (`--accent-wave`, the Aloha Pixel brand mark is a wave).
  One wave per mode: coral-500 stroke in light, coral-400 in dark and in the
  deep scene, matching the primary.
- Blockquote, dropcap and the giant card initials moved from the serif to
  the display grotesque; `--font-serif`/`--font-script` remain as aliases of
  `--font-display`. Two fonts load instead of three.
- Docs updated: README, AGENTS, SPEC, THIRD-PARTY, the tailwind rule and
  this wiki.

## 2026-08-16 - art direction redone

The theme's look was rebuilt around reading.

- Neutral is now a cold blue-night ink (ink-950 `#0a0f17`) on a faintly blue
  paper; coral stays the house accent; the second accent is a frank aquamarine
  reef blue (`#3fc0e0`).
- Display type is Space Grotesk with Instrument Sans in the body; Instrument
  Serif keeps the one italic accent word of each big title.
- The home leads with a stack of article cards in perspective over a dark,
  framed scene with drifting halos.
- Docs re-anchored to the new palette and type: README, AGENTS, SPEC,
  THIRD-PARTY, and the wiki (overview, tokens, and every subsystem page).

## 2026-08-15 - inventory

- Code state: `pnpm build` green, 55 pages, `astro check` at 0/0/0. Two
  selfchecks pass: schema (29 assertions) and pagination.
- Inventory: 36 primitive families (63 .astro files, 10 with a script tag) in
  src/components/ui; 22 Sections; 60 original icons in
  src/components/svg/icons/icons.ts; 55 animate-* utilities in src/styles/motion
  plus 3 brand animations in tokens.css; 3 content collections (posts, authors,
  topics). There is no React and no island.
- Wiki pages: index, overview, log, and the subsystems tokens, ui-primitives,
  seo, motion, content, i18n, mobile-app and fluidity.
