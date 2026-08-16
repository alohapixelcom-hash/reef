<!-- wiki/subsystems/tokens.md - the three-floor token system: raw palette, semantic aliases, utilities, and everything that reads them. -->
---
title: Design tokens
summary: How tokens.css turns one brand palette into every color, radius, shadow and animation in the theme, why the middle floor is `inline`, and how rebranding works.
sources:
  - src/styles/tokens.css
  - src/styles/global.css
  - scripts/rebrand.mjs
  - scripts/og.mjs
  - src/layouts/BaseHead.astro
updated: 2026-08-15
---

# Design tokens

One file, src/styles/tokens.css, is the design system. It is built as three
floors, and markup is only ever allowed to touch the third.

## The direction, in three lines

Reef is made to be read, so the palette is quiet and cold. The neutral is a
deep blue-night ink, not a warm grey; the light surface is a faintly blue
paper. The house coral is the one warm accent, and a frank aquamarine reef
blue is the second accent that marks a topic or a link. The night version is
the same roles reassigned, not a second stylesheet.

## Floor 1: raw palette

Inside `@theme`: three colour ramps and the non-colour tokens.

- **Ink**, the neutral. A very deep, cool blue (deep water, night), never a
  neutral grey: ink-50 `#f3f6fa` is the faintly blue paper, ink-950 `#0a0f17`
  the ink.
- **Coral**, the house accent, the thread that says Aloha, Reef, Swell, Koa and
  Kai come from one workshop. coral-500 in light, coral-400 in dark.
- **Reef**, the second accent and the signature of the theme. A frank
  aquamarine (reef-500 `#1a9fc4`, reef-400 `#3fc0e0`) that marks topics, links
  and quiet states, never a flat background under long text.
- **Typography**: `--font-display` Space Grotesk (headings), `--font-sans`
  Instrument Sans (body and interface), `--font-serif` and `--font-script`
  Instrument Serif (italic only, the one accent word of each big title). The
  display scale runs to 5.5rem; both variable families load the weight axis
  only.
- **Radii**: card 0.875rem, panel 1.25rem, pill 999px. Buttons are pills; cards
  and panels are gently rounded, which reads as calm on a page of prose.
- **Brand animations**: rise, marquee, pulse-slow (`--animate-*` at
  tokens.css:148-150, keyframes :258-286).

## Floor 2: semantic aliases, and why `inline` matters

`@theme inline` maps role names to `--reef-*` variables: background, foreground,
muted, muted-foreground, card, card-foreground, primary, primary-foreground,
accent, accent-foreground, border, ring, surface, scrim, and the three shadows.
`:root` assigns the light values; `.dark, .on-dark` reassigns the same
variables, so dark mode is a reassignment and not a parallel stylesheet.

The `inline` keyword is load-bearing. It makes the utilities compile to
`var(--reef-primary)` rather than `var(--color-primary)`. Custom properties are
substituted at computed-value time, so an alias declared once at `:root` would
freeze there; a utility that points straight at `--reef-*` resolves at the
element instead. That single difference is what lets `.on-dark` repaint an
entire subtree by re-declaring those variables on a container: the hero and any
dark section are correct inside a page that may be light, and their content is
written with the same roles as everything else, with no hex and no
`text-white`.

The corollary is a trap: a component `<style>` that writes
`var(--color-background)` by hand will NOT follow `.on-dark`. Component styles
use `--reef-*`.

## Two themes, not one switch

Light and dark do not share a shadow recipe, and that is the whole point of the
art direction. In light, a cast shadow tinted ink (never black, which would
grey out the coral it surrounds). In dark, a cast shadow is invisible: it
darkens an already dark surface and the card stops floating. The dark values
therefore swap it for a luminous border, an inner highlight and a tighter
coloured glow. Copying the light recipe into the dark block is how a theme
stops being two themes and becomes one theme with a switch.

## Floor 3: what markup writes

The generated utilities (bg-background, text-foreground, bg-card, bg-primary,
text-muted-foreground, border-border, bg-surface, text-accent, bg-scrim,
ring-ring, rounded-card|panel|pill, shadow-float|lift|glass, font-display,
font-sans, font-serif, font-script, text-display-*) plus the house classes from
src/styles/global.css: `.accent-script`, `.glass`, `.glass-light`,
`.container-page`, `.container-wide`, `.measure-prose`, `.measure-wide`,
`.bleed`.

Palette names in markup are forbidden. When a component needs a colour no role
expresses, the fix is a house class in global.css, not a palette name in the
markup. The enforcement grep lives in .claude/rules/tailwind.md.

## Who else reads tokens.css

The file is machine-read, which is why its variable naming is a stable
contract:

- scripts/rebrand.mjs rewrites the ink, coral and reef ramps from one brand
  colour (`pnpm rebrand "#hex"`), backing up the original palette and restoring
  it with `--restore`. It touches floor 1 only; markup never moves.
- scripts/og.mjs reads the ramps to render the Open Graph cards, so `pnpm og`
  after a rebrand repaints them too.
- src/layouts/BaseHead.astro imports the file raw to build the inline SVG
  favicon and the theme-color metas from the palette.

## Dark mode wiring

The `.dark` class on `<html>` is applied before first paint by
src/components/ui/theme-toggle/ThemeInit.astro (localStorage key "reef-theme").
The default is dark, on purpose, and the system preference is not followed; a
stored choice always wins. It is re-applied after every view transition on
astro:after-swap, because the swap replaces the server-rendered `<html>`
attributes. Tailwind's `dark:` variant is bound to that class by the
`@custom-variant` in src/styles/global.css, but components written with floor-3
roles almost never need it.
