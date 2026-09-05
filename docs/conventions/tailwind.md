<!-- docs/conventions/tailwind.md - Tailwind 4 CSS-first: the token contract and the classes markup may use. -->

# Tailwind rules

## There is no tailwind.config.js

Tailwind 4 is configured in CSS. The whole design system lives in
src/styles/tokens.css, loaded by src/styles/global.css:4 through the
Vite plugin (astro.config.mjs:53). Adding a config file would be a bug.

## The three floors of tokens.css

1. Raw palette (tokens.css, `@theme`): `--color-ink-*`, `--color-coral-*`,
   `--color-reef-*`, fonts, the display type scale, radii, shadows, brand
   animations.
2. Semantic aliases (tokens.css, `@theme inline`): `--color-background`,
   `--color-primary`... mapped onto `--reef-*` variables set on `:root`
   and re-assigned under `.dark, .on-dark`.
3. Utilities, the only floor markup touches: `bg-background`,
   `text-foreground`, `bg-card`, `text-card-foreground`, `bg-primary`,
   `text-primary-foreground`, `bg-muted`, `text-muted-foreground`,
   `border-border`, `bg-surface`, `text-accent`, `text-accent-text`, `ring-ring`.

An eleventh role joined the list on 1 September 2026, and it is the only one
that exists for a measurement rather than for a meaning: `text-accent-text`.
The house coral is built to be seen, so on a pale ground it lands between 2.6
and 3.7 to 1, where WCAG AA asks 4.5 for body text. Rather than repaint the
brand, the two jobs were split: `bg-accent`, `border-accent`, the gradients and
the title wave keep the exact coral they always had, and any accent that
carries TEXT or an icon uses `text-accent-text`, one step darker on the same
ramp. In dark mode the accent already clears AA, so the token simply points
back at it. Writing `text-accent` on a piece of text is now a bug: the utility
still exists, because `--color-accent` still has to name the decorative colour.

Hard rule: palette names never appear in markup. No `bg-ink-900`, no
`text-coral-400`, no raw hex. Those names exist only inside tokens.css and
its known readers: scripts/rebrand.mjs, scripts/og.mjs and BaseHead's favicon
extraction. `pnpm rebrand` repaints the theme by editing floor 1 only; one
leaked palette class in markup breaks that promise. Check yourself:

```bash
grep -rn "ink-\|coral-\|reef-\|#[0-9a-fA-F]\{3,6\}" src/components src/pages --include="*.astro"
```

Judge the hits: a mask gradient written `#000` is an alpha channel, not a
color. Anything else that styles something fails.

## Token-generated utilities and house classes

- From tokens: `font-display`, `font-sans`, `font-serif`/`font-script`
  (compatibility aliases of the display font),
  `text-display-sm|md|lg|xl`, `rounded-card|panel|pill`,
  `shadow-float|lift|glass`, `animate-rise|marquee|pulse-slow`.
- From global.css: `.accent-script`, `.glass`, `.glass-light`,
  `.container-page`, `.container-wide`, `.measure-prose`, `.measure-wide`,
  `.bleed`.
- The motion catalog adds 55 `animate-*` utilities via `@utility` in
  src/styles/motion/*.css. New utilities go there or in tokens.css, never
  inline in a component's `<style>`.

## Dark mode

`.dark` on `<html>`, wired by the `@custom-variant` in global.css:8 and
applied pre-render by src/components/ui/theme-toggle/ThemeInit.astro. The
semantic tokens invert themselves (tokens.css:230-246), so a component
written with floor-3 roles is dark-ready with zero `dark:` classes. Reach
for `dark:` only for effects a role cannot express; if you are writing
`dark:bg-...` for a color role, the token layer is the place to fix.

A surface written `bg-white` or as a hex value stays white in dark mode while
its text, written with a token, turns light: on 5 September 2026 three such
cards on the alohapixel.com home page rendered light text on a white ground,
unreadable. So a surface ALWAYS carries a role (`bg-card`, `bg-surface`,
`bg-background`) and its text the matching role (`text-card-foreground`,
`text-foreground`, `text-muted-foreground`). `bg-white` is admitted only under
text written with the one ink token that never follows the theme (`text-scrim`
here, `text-ink` / `text-ink-soft` on alohapixel.com): a white card meant to
stay white, such as a third-party embed or the hero button on a photograph.
The render bench (`pnpm verify`) now measures both modes and catches a surface
that forgot its role.

## Variants and merging

- Component variants use `tv()` from tailwind-variants, and the config is
  exported so others reuse it instead of copying classes:
  `export const button = tv({...})` in
  src/components/ui/button/Button.astro:9 is the canon.
- Caller classes merge through the config: `button({ variant, size, class:
  className })`. Never concatenate class strings by hand.

## Signature rules the brand depends on

- Buttons are pills: `rounded-pill`, no exception (Button.astro:11).
- Cards float: `bg-card rounded-card shadow-float`.
- Sections breathe: `py-24 md:py-32`.
- Display headings: `font-display` (Space Grotesk), and exactly one word per
  big title wrapped in `<span class="accent-script">`: it keeps the heading
  font, turns the house turquoise and carries the turquoise wave underline
  (`--accent-wave`). Coral is the second accent, rationed. Never an italic
  serif.
