<!-- .claude/skills/wiki/SKILL.md - the wiki maintainer: sync, ask and lint operations over wiki/, with path:line citations. -->
---
name: wiki
description: Maintain and query the repo wiki in wiki/. Operations - sync (re-anchor pages on the current code after changes), ask (answer a question about the repo from the wiki, citing sources), lint (detect stale citations, dead links, orphan pages). Use after structural changes or when asked how the theme works.
---

# Wiki maintainer

The wiki (wiki/) is the repo's long-term memory: a small set of markdown
pages that describe how Reef actually works, anchored to real files. It is
useful only while it tells the truth, so every operation below exists to
keep it true. The code is always the source of truth; the wiki is the map.

## The page contract

Every page starts with the one-line path comment, then YAML frontmatter:

```markdown
<!-- wiki/subsystems/example.md - what this page covers. -->
---
title: Example subsystem
summary: One sentence stating what this page explains.
sources:
  - src/path/one.ts
  - src/path/two.astro
updated: 2026-08-14
---
```

- `sources` lists the files the page is anchored to; sync uses it as its
  reading list.
- Claims cite their anchor inline as `path:line` (single line) or
  `path:start-end` (range), for example: "the semantic aliases live in
  src/styles/tokens.css:103-149". Cite only lines you have read in the
  current working tree. A citation you have not verified is worse than no
  citation.
- Pages link to each other with relative links (`[tokens](tokens.md)`), stay
  under 400 lines, use plain hyphens only, and are written in English.
- wiki/index.md is the table of contents; wiki/log.md is the append-only
  journal. Every other page must be reachable from index.md.

## Operation: sync

Re-anchor the wiki after code changes. Steps:

1. Identify what changed: `git diff --name-only` against the last log entry
   date, or the files the caller names.
2. For each changed file, find affected pages: grep the wiki for the file's
   path (both `sources` entries and inline citations).
3. Re-read the changed files, then update the affected pages: fix line
   numbers, rewrite claims that are no longer true, delete claims about
   deleted code, add sections for new behavior worth mapping. Do not
   paraphrase diffs; describe the current state.
4. Bump `updated` on every touched page.
5. Append one dated entry to wiki/log.md: what changed in the code, which
   pages were updated, and any new open thread. Newest entry first.

A sync that finds nothing to update still logs that fact. If a whole new
subsystem appeared, create wiki/subsystems/<name>.md and register it in
wiki/index.md in the same pass.

## Operation: ask

Answer a question about the repo using the wiki first.

1. Read wiki/index.md, pick the relevant pages, read them.
2. Answer from those pages, quoting their `path:line` citations so the asker
   can jump to code.
3. Before delivering, spot-check each citation you are about to repeat: open
   the file at that line. If the wiki is stale, say so, answer from the code
   directly, and either fix the page immediately or record the staleness in
   wiki/log.md as an open thread.
4. If the wiki does not cover the question, answer from the code and say the
   coverage is missing; propose (or write) the missing section.

Never invent a citation to look grounded. An answer without a source must
say it has none.

## Operation: lint

Health check of the whole wiki. Report findings grouped by page, each with a
proposed fix; apply mechanical fixes when asked.

- Stale citations: every `path:line` and `path:start-end` in every page is
  checked against the working tree. The file must exist and the cited lines
  must still contain what the claim says they contain (read them; do not
  just check the file length).
- Dead links: every relative markdown link resolves to an existing file;
  every `sources` entry exists in the tree.
- Orphans: pages not linked from wiki/index.md; source files central to the
  repo (layouts, config, js, styles entry points) not covered by any page.
- Contract breaches: missing or malformed frontmatter, missing path-comment
  first line, page over 400 lines, forbidden dashes, `updated` older than
  the newest log entry that names the page.

End the lint report with a count: pages checked, citations checked, findings
by category. Zero findings is a valid, reportable result.

## Style

Wiki prose is factual and compact: say what the code does and where, not how
nice it is. No duplicated tutorials that will drift; link to the real file
instead of pasting long excerpts (short, load-bearing snippets are fine).
When code and wiki disagree, the code wins and the wiki gets fixed the same
day the disagreement is found.
