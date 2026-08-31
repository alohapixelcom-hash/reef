<!-- wiki/log.md - append-only journal of the wiki: dated entries, newest first, plus the open threads. -->
---
title: Wiki log
summary: Dated journal of code changes reflected in the wiki, and the list of open threads.
sources: []
updated: 2026-08-31
---

# Wiki log

Newest entry first. Every `wiki sync` appends an entry here, even when
nothing needed updating. Open threads are questions or known gaps waiting on
a decision; close them by editing this list and noting the resolution in a
dated entry.

## 2026-08-31 - 1.6.0, the redirect only robots could see

- The demo worker answered `302` toward `/fr/` to any client that sent no
  `Accept-Language` header. Browsers always send one, so the fallback only ever
  applied to crawlers: Googlebot was redirected away from the English pages that
  the hreflang set declares canonical, on every root URL. The fallback is the
  root language again, which is what Reef had all along.
- `docs/design.md` now describes six themes. Nalu joins the family: it is the
  storefront of a WooCommerce shop, read headless from the public Store API at
  build time.
- The whole family moves to 1.6.0 together, so a buyer of the pass still has one
  number to remember, now for six archives.

## Open threads

- The contact form runs in demo mode by design: contact.astro ships with no
  `action` and stays that way until a user wires it to an endpoint. Not a
  bug; recorded so nobody "fixes" it.

## 2026-08-30 - 1.5.4, what the sold archive did not have

Second pass of the day. The 1.5.3 archives on the store were built before
most of that day's corrections landed, so this release exists to make the
file a buyer downloads equal to the repository.

- `docs/design.md` was rewritten. The doctrine described four themes in
  tables that should have held five, refused two typefaces the flagship of
  the house actually uses, and claimed no theme here ships an animation
  library while `motion` and `three` sat in Aloha's dependencies. It now
  names its own exceptions instead of hiding them, and it ends with the list
  of what the house still owes itself.
- `src/js/schema.selfcheck.ts` carried the demo brand of another theme, in
  all five repositories. A fixture belongs to no theme: the identity is now
  Example Studio, example.com, Example Author.
- `pnpm-lock.yaml` is versioned. The repository pinned pnpm and pinned not a
  single package version, so a fresh clone resolved whatever the registry
  served that day.
- Verified before shipping, not asserted: `pnpm install --frozen-lockfile`,
  then `pnpm check` with zero errors, zero warnings and zero hints, then
  `pnpm build` emitting the 55 pages the README claims.

## 2026-08-30 - audit of the public repository

A pass over every claim the repository makes about itself, after an audit
found the docs and the code disagreeing in several places.

- Reef is free and MIT everywhere it is described. "Commercial theme",
  "sold by Aloha Pixel", "buyer" and the paid-archive paragraph of DEPLOY.md
  are gone; the reader of this repo is a user.
- One story about the photographs, in LICENSE, PHOTOS.md, THIRD-PARTY.md,
  README, SPEC and DEPLOY: ten Pexels photographs (one hero, nine covers)
  under the Pexels licence, redistribution allowed. THIRD-PARTY.md no longer
  claims a studio archive outside the MIT grant, and no longer counts eleven.
- The home video is credited to the file it actually loads: Pexels video
  4863640, a wave filmed from underwater at Electric Beach, Hawaii, 9 MB.
- Seven article covers got a coverAlt that describes the photograph the build
  actually fetches. The Pexels pages were re-read one by one; PHOTOS.md was
  right and the alt texts had drifted.
- The accent colour is stated as it is coded: the accent word keeps the
  heading font, turns the house turquoise and carries a turquoise wave;
  coral is the second accent, rationed.
- ThemeInit falls back to light, and the docs say so.
- Counts recounted: 24 Sections, 9 runtime dependencies. 55 pages, 36 UI
  families, 63 .astro files, 60 icons and 55+3 animations were already right.
- The demo studio has three people in the copy, as it has always had three in
  src/data/authors/.
- Removed: .env.example, a leftover from another theme (it pointed at
  src/actions/ files that do not exist here). Fixed: dead path:line citations
  in docs/conventions/ and in this wiki, two links pointing at files that do
  not exist (a conventions page and an islands folder), and the worker's
  fallback locale, which sent every other language to /fr/ instead of the
  default.
- Two more found by re-reading the pushed tree: src/i18n/config.ts sent a
  translator to src/i18n/routes.ts, a file that has never existed here, and
  described the dictionaries as flat files instead of folders. URL segments
  are not translated at all: they are written once in navData.json.ts and
  localizePath only prefixes the language. And motion/index.css announced
  five families in its header while importing six.

## 2026-08-16 - wave accent

The accent word of headings dropped its separate font.

- The separate accent font is gone (package, import, tokens): the
  italic-serif accent word is banned across the whole family - it had become
  the marker of generated sites, not a signature.
- The accent word keeps the heading font, turns the house turquoise, and
  carries a turquoise WAVE underline (`--accent-wave`, the Aloha Pixel brand
  mark is a wave). One wave per mode: reef-600 stroke in light, reef-400 in
  dark and in the deep scene, matching the primary. Coral stays as the second
  accent, rationed.
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
  src/components/ui; 24 Sections; 60 original icons in
  src/components/svg/icons/icons.ts; 55 animate-* utilities in src/styles/motion
  plus 3 brand animations in tokens.css; 3 content collections (posts, authors,
  topics). There is no React and no island.
- Wiki pages: index, overview, log, and the subsystems tokens, ui-primitives,
  seo, motion, content, i18n, mobile-app and fluidity.
