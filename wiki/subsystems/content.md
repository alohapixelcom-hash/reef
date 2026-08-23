<!-- wiki/subsystems/content.md - collections, demo data and the typed config layer that feed every page. -->
---
title: Content and config
summary: The three zod-validated collections in src/data, the typed config files in src/config, and how pages consume them.
sources:
  - src/content.config.ts
  - src/config/siteData.json.ts
  - src/config/siteSettings.json.ts
  - src/config/navData.json.ts
  - src/config/legalData.json.ts
  - src/config/types/configDataTypes.ts
updated: 2026-08-15
---

# Content and config

Two data layers feed the pages: content collections (editorial, grows with
the site) and typed config (structural, edited once per brand). Neither
layer contains presentation; components translate data into tokens.

## Collections (src/content.config.ts)

Three collections, glob-loaded from src/data, validated by zod at build:

- posts: Markdown or MDX files in src/data/posts, filed by language; the base
  file name is the shared slug (/blog/<slug>/). Frontmatter: title,
  description, publication date, a validated `reference("authors")`, a
  validated `reference("topics")` (a single topic, not a free-form category),
  tags, an optional cover with alt text, `featured`, and `draft` defaulting to
  false. Drafts still build for local preview but are filtered from lists, RSS
  and llms.txt with `data.draft !== true`.
- authors: one JSON per person in src/data/authors (name, role, bio, and an
  optional list of labelled links), resolved from posts via the reference.
- topics: one JSON per subject in src/data/topics (name, description, an
  `accent` constrained to coral | reef | ink, and an `order`). Each topic has
  its own archive page and its own description, so an archive is never a page
  with nothing to index.

Demo content shipped: 9 posts, 3 authors, 5 topics, in two languages. The blog
routes multiply from these entries (paginated index, per-post, per-topic and
per-author pages), which is why the built site has more pages than src/pages
has files.

## Config (src/config/)

All shapes live in one place, src/config/types/configDataTypes.ts, and each
file default-exports one typed object:

- siteData.json.ts: name, title, description, author, default OG image.
  The first file a buyer edits (its own header says so).
- siteSettings.json.ts: two switches, useViewTransitions and useAnimations,
  declared with `satisfies` so literal types survive. BaseHead reads the first
  to mount the ClientRouter.
- navData.json.ts: the main nav and the footer columns. The only source of
  truth for site links.
- legalData.json.ts: the legal documents (title, description, lastUpdated,
  sections) rendered by one legal template; the copy is deliberately generic
  and marked for buyer review.

## Pure helpers around content

src/js/textUtils.ts: slugify, humanize, formatDate pinned to UTC so builds do
not drift a day across timezones, readingTime at 220 wpm. src/js/pagination.ts:
paginate (an empty list still produces one page so /blog/ always exists) and
buildPageHref (page 1 at the root, /blog/2/ beyond, trailing slash always).
Both files have selfchecks; see docs/conventions/typescript.md.

## Editing rules

New link: navData. New post: a Markdown file in src/data/posts with an existing
author id and topic id, one file per language under the same slug. New author
or topic: a JSON in the matching folder. Changing shapes means updating
configDataTypes.ts (or content.config.ts) in the same change, then `pnpm check`.
