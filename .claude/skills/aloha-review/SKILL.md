<!-- .claude/skills/aloha-review/SKILL.md - the house quality review: mechanical gates, then judgment, then a verdict. -->
---
name: aloha-review
description: Run the Aloha quality review on changed or named files. Use before merging any component, page, style or script work in this repo. Produces a verdict (SHIP, POLISH, REWORK) with file:line evidence for every finding.
---

# Aloha review

You are reviewing code that people pay for and then read. The buyer of this
theme opens the source the way a reader opens a book: every file is part of
the product. Review accordingly. "It works" is the entry ticket, not the
verdict.

Scope: the files the caller names, or the files changed since the last
commit. Read each one fully before judging it.

## Phase 0 - mechanical gates, no judgment involved

Run these checks first. Any hit is an automatic finding; three or more
distinct gate failures cap the verdict at REWORK.

```bash
# 1. Forbidden dashes (em or en) anywhere: code, comments, copy, docs
grep -rnP "\x{2014}|\x{2013}" src scripts wiki *.md 2>/dev/null

# 2. Raw palette or hex leaked into markup. Everything found is a finding.
grep -rn "ink-\|coral-\|reef-\|#[0-9a-fA-F]\{3,6\}" src/components src/pages --include="*.astro"

# 3. Files over the 400-line ceiling
find src scripts -type f \( -name "*.astro" -o -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.mjs" \) | xargs wc -l | awk '$1 > 400'

# 4. Files missing the one-line header (path + role)
for f in $(git diff --name-only HEAD -- 'src/**' 2>/dev/null); do head -3 "$f" | grep -q "$f" || echo "no header: $f"; done
```

Then confirm the build and the selfchecks are green: `pnpm check`,
`pnpm build`, and `node src/js/schema.selfcheck.ts`,
`node src/js/pagination.selfcheck.ts`.

## Phase 1 - design system conformance

The contract is src/components/ui/README.md and .claude/rules/tailwind.md.
Check, with line references:

- Only semantic tokens in markup (bg-background, text-foreground, bg-card,
  bg-primary, text-muted-foreground, border-border, bg-surface, text-accent,
  ring-ring). A single bg-white is acceptable only where the design says
  white-on-dark (hero buttons, glass cards); a hex outside those cases is a
  finding.
- Buttons are pills. Anything clickable that looks like a button goes
  through the exported `button` config from
  src/components/ui/button/Button.astro, or justifies why not.
- Variants via an exported tv() config. Copied class strings between
  components are a finding: point at the config that should have been
  reused.
- Big titles: exactly one accent-script word. Zero is bland, two is noise;
  both are findings.
- data-slot on every part's root element; one-line header on every file.

## Phase 2 - the zero-JavaScript audit

Every `<script>` must justify its existence.

- For each `<script>` in a .astro file: name the platform feature that was
  insufficient. `<dialog>`, `<details>`, anchors, :focus-within, CSS
  animations and view() timelines cover most needs. A script that toggles a
  class an existing utility could handle is a REWORK finding.
- Scripts must be idempotent and view-transition safe: re-init on
  astro:page-load with a data-*-ready guard, or document-level delegation
  (compare src/components/ui/reveal/Reveal.astro and
  src/components/ui/_dialog.ts). A script that binds twice after one
  navigation is broken, even if it demos fine.
- There is no React and no island in this theme. A .tsx file, a `client:`
  directive or an added framework is a REWORK finding.
- No new runtime dependency without a THIRD-PARTY.md entry in the same
  change.

## Phase 3 - accessibility, non negotiable

- Interactive targets at least 44px on touch (h-11 or size-11 minimum).
- Real elements: links navigate, buttons act; no div-with-onclick.
- Icons decorative by default, aria-label when they carry meaning
  (src/components/svg/icons/Icon.astro:16-18 shows the pattern).
- Images and image props carry alt text. Headings nest without gaps.
- Focus visible everywhere (the global :focus-visible ring must not be
  suppressed), natural tab order, aria wired to real ids (Dialog's
  labelledby convention, src/components/ui/dialog/Dialog.astro:2-6).
- Motion respects all three reduced-motion layers (.claude/rules/motion.md).
  Anything that hides content before JavaScript runs is a REWORK finding.

## Phase 4 - structure and debt

- Prefer the restructuring that deletes branches over the patch that adds
  one. An ad hoc `if` grafted into a clean flow is a design smell: say what
  shape would make it disappear.
- A file nearing 300 lines gets a split suggestion; over 400 it fails
  Phase 0 anyway.
- Copy is confident, concrete, Reef Notes-branded, no lorem ipsum.
- Leftover TODOs must be recorded in wiki/log.md under open threads, or
  resolved. Silent debt is a finding.

## The verdict

End with exactly one of:

- SHIP: gates clean, no finding above nitpick level. List nitpicks anyway.
- POLISH: mergeable intent, fixes required; every fix has file:line and a
  concrete suggested change.
- REWORK: a gate failure, a broken contract (tokens, zero-JS, a11y), or a
  structural problem. Explain the shape the redo should take, in at most
  five sentences.

Never soften a verdict because the work was large. Never pad findings to
seem thorough: three real findings beat ten invented ones.
