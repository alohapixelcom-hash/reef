<!-- CHANGELOG.md - ce qui a change dans Reef, version par version. -->

# Reef - changelog

Every theme in the family carries the same version number, so a number that
moves here moved in all seven. The dated working notes behind each entry, with
the reasoning and the files, are in `wiki/log.md`.

Current version: **1.7.0**.

## 1.7.0 - 2026-09-02

A seventh theme joins, and the whole family takes its number.

- Kona ships. It is a headless storefront for an existing Shopify shop: the
  catalogue is read at build time from the shop's own public JSON, so there is
  no app to install, no Storefront token to mint and nothing to change on the
  shop. See kona.alohapixel.app.
- Not one line of code changed in THIS theme. Three files differ from 1.6.3 and
  all three are paperwork: `package.json` for the number, this changelog, and
  `docs/design.md` because the family is seven themes and two of them are
  headless. Every other byte is the byte of 1.6.3. Reef stays MIT and its
  LICENSE does not move: the commercial agreement never covered it.

## 1.6.3 - 2026-09-01

The accent could not be read, and the code was barely legible.

- Accent text now meets WCAG AA. The house coral is built to be seen, so on a
  pale ground it landed between 2.6 and 3.7 to 1, where AA asks 4.5 for body
  text. The brand is unchanged: `bg-accent`, `border-accent`, the gradients and
  the title wave keep the exact coral they had, and only text and icons move to
  the new `text-accent-text` role, one step darker on the same ramp. Dark mode
  already cleared AA and does not move at all.
- A drawn phone shows the home page on mobile, once per site, in a column that
  was empty on wide screens and hidden below `lg`. `pnpm poster` re-shoots the
  capture from `dist/`; without a capture the block renders nothing rather than
  a broken frame.
- Three new commands, and the tooling a coding agent needs: `pnpm test`,
  `pnpm lint:house`, `pnpm verify` (a Playwright render bench over `dist/` at
  390, 768 and 1440), plus `CLAUDE.md` and `.claude/settings.json`, which the
  1.6.2 archive did not carry.
- Render defects found by the bench and repaired, each one measured before and
  after. The bench now reports no defect at all on this theme.

## 1.6.2 - 2026-08-31

The light ground stops being white.

## 1.6.1 - 2026-08-31

The wave under the accent word was cut in half.

## 1.6.0 - 2026-08-31

The redirect only robots could see.

## 1.5.4 - 2026-08-30

What the sold archive did not have.
