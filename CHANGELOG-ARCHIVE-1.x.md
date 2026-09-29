<!-- CHANGELOG-ARCHIVE-1.x.md - les entrees anciennes du changelog de Reef, de la 1.7.2 a la 0.2.0, sorties de CHANGELOG.md pour tenir le plafond de 400 lignes. -->

# Reef - changelog archive (1.7.2 and before)

Older entries, moved here on 28 September 2026 (1.7.2 on 29 September) so that `CHANGELOG.md` stays under 400 lines. Newer entries live in `CHANGELOG.md`.

## 1.7.2 - 2026-09-07

Astro 7.3, a render bench that measures translucent colours instead of giving
up in front of them, and everything it found the hour it learned to.

- The whole family moves to Astro 7.3 (`astro@7.3.1`). Nothing else in the
  dependency tree moved, and the seven themes are green on types, build,
  selfchecks, house lint and the render bench.
- `pnpm verify` COMPOSITES COLOURS. Until this release the contrast check
  declared a ground unreadable as soon as it was not fully opaque, and skipped
  any ink under 95 percent opacity. Both describe ordinary house writing: a
  tinted chip on a card, a note written `text-muted-foreground/80`. The bench
  was therefore silent on a whole family of surfaces a browser paints
  perfectly well, while Lighthouse read them and failed them. It now stacks
  the translucent layers onto the first opaque colour underneath, and blends a
  translucent ink into the result, exactly as the engine paints it. It still
  refuses the one case it truly cannot read, text over a photograph, and it
  finds that case from the rectangle of every image, video and canvas on the
  page instead of guessing from the ancestors.
- It also measures every element that paints its OWN text. It used to start
  from a list of tags and keep only those that contained no other, which
  missed the commonest shape in this codebase: an element carrying an icon AND
  a word.
- What it found here, the same hour: the topic label on the post cards was at
  3.99 to 1 where AA asks 4.5, and the three footer column labels at 3.70. The
  label takes a twelfth semantic role, `text-primary-text`, one step darker on
  the turquoise ramp and pointing back at the primary in dark mode, exactly as
  `text-accent-text` has done for the coral since 1.6.3. The column labels go
  back to full ink: an attenuated recessive role is how a theme quietly loses
  AA.
- The bench stopped changing its mind: it waits for a condition (fonts in,
  layout stable, a title box) instead of a 400 ms delay that reported phantom
  missing h1s under load, and measures five widths (1024 and 1280 added).
- The stylesheet travels inside the HTML (`build.inlineStylesheets: "always"`).
  Lighthouse measured 730 ms of render blocking before the first pixel on the
  demo, from stylesheet requests alone. The trade is written out in
  `astro.config.mjs`, and one word puts it back.
- The demo posters are served by the site (`src/assets`, both crops built)
  instead of the video host, which set two third-party cookies; the video
  stays remote and loads only on scroll.
- Measured on the demo, mobile: best practices 77 to 100, accessibility to
  100, render-blocking stylesheet requests from three to zero.

## 1.7.1 - 2026-09-05

The filmed sequence scrolls on phones too, the render bench measures dark
mode, and Aloha's title mask stops clipping letters.

- The filmed sequence of the home page (`_film.ts`) now drives the video with
  the scroll on phones as well. Until this release the engine required 1025 px
  of width and left phones a still poster; the portrait clip and the play-pause
  priming of the decoder were already there for this. The only fallbacks left
  are the reader's own: reduced motion and data saving. The scene that mounts
  the engine says so in its comment.
- The render bench (`pnpm verify`) measures every page in both modes, light
  and dark, and `docs/conventions/tailwind.md` writes the rule the dark pass
  enforces: a surface always carries a role (`bg-card`, `bg-background`...)
  and its text the matching role; `bg-white` is admitted only under an ink
  that does not follow the theme. The probe reads an SVG's class with
  `getAttribute` (its `className` is an `SVGAnimatedString`) and honours
  `dark:` display variants.
- Aloha's title mask (`SplitReveal`) and hero button were fixed the same day;
  neither reaches this theme, which carries no `SplitReveal`.
- Code comments in the blog posts were at 3.88 to 1 in dark mode: the dark
  Shiki theme becomes `github-dark-default` (`astro.config.mjs`,
  `src/styles/prose.css`).
- No decorative pill, anywhere: the house rule is written in `AGENTS.md`. The
  featured post card loses its "Featured" label, which said a third time what
  the section eyebrow already says, and the prop that carried it
  (`FeaturedPostCard.astro`, `FeaturedPost.astro`, the `featuredLabel` string
  in both dictionaries). `rounded-pill` stays the shape of buttons, fields and
  the topic chips, which are real links.
- `LICENSE` now holds the MIT text and nothing else, so that GitHub and every
  license scanner read it correctly; what used to sit around it (the Pexels
  licence of the photographs, the demo content, the third-party material)
  moved to `NOTICE.md`, new, and `README.md` and `THIRD-PARTY.md` point there.
  Reef stays MIT: the grant does not change.
- The public repository speaks English end to end: `DEPLOY.md` and `SPEC.md`
  are translated. The README header image answers again.
- `pnpm dev` works on a clean clone: a `predev` script fetches the demo
  photographs into `src/assets/` before the server starts, because the
  repository does not version them, and the README says so. `.gitignore` also
  keeps system files and logs out of the repository.
- Files that differ from 1.7.0 in THIS theme: `package.json`, this changelog,
  `.gitignore`, `AGENTS.md`, `DEPLOY.md`, `LICENSE`, `NOTICE.md`, `README.md`,
  `SPEC.md`, `THIRD-PARTY.md`, `astro.config.mjs`, `scripts/verify.mjs`,
  `scripts/verify.probe.mjs`, `docs/conventions/tailwind.md`,
  `src/styles/prose.css`, `src/components/Sections/Home/_film.ts`,
  `src/components/Sections/Home/FilmScene.astro`,
  `src/components/Sections/Home/FeaturedPost.astro`,
  `src/components/Cards/FeaturedPostCard.astro`, `src/i18n/ui/en/pages.ts` and
  `src/i18n/ui/fr/pages.ts`. A pass holder still has one number to remember,
  for seven archives.

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
