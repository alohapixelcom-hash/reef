<!-- CHANGELOG.md - ce qui a change dans Reef, version par version. -->

# Reef - changelog

Versions describe the features actually shipped in this theme.

Current version: **3.1.0**.

## 3.1.0 - 2026-09-22

The optional publication engine. Everything in this entry is off by default:
without `ALOHA_MOTEUR=emdash` the theme builds exactly as before, to static
HTML, and the 63 HTML, XML and TXT files of that build were compared one by
one with the previous release. See `docs/moteur.md`.

- **Publishing without a build.** With the variable set, the same source
  builds as a Cloudflare Worker on EmDash 0.38 (MIT): posts in D1, media in
  R2, and the pages that show a post rendered on demand from the database.
  Publishing in the back office is visible on the site with no build, measured
  at 31 to 112 ms locally on the production build (publish, correct,
  unpublish, three passes). One alias (`@moteur/source`) picks the files or
  the database, both return the same collection entry, and no component was
  rewritten.
- **The back office, in the theme's clothes.** EmDash's React administration
  at `/_emdash/admin` is skinned from `tokens.css` itself: the theme's fonts,
  surfaces, inks, brand colour and pill buttons, light and dark, and
  `pnpm rebrand` restyles it in the same move. Every visible text was measured
  against WCAG AA in seven views and two modes. The theme's own stylesheet no
  longer leaks into the admin page: a page imported by the on-demand sitemap
  had stopped being a style boundary for Astro, which inlined 127 KB of theme
  CSS into the back office and into the manifest of 73 API routes; the
  sitemap now replays the path functions of the pages without importing them.
- **The back office in French, entirely.** French is the default: the engine
  still chooses per person (cookie, then site default, then browser), and
  `ALOHA_BO_LANGUE` changes that default or hands it back to the browser
  (`navigateur`). EmDash's own French catalogue leaves 678 of its 2428
  messages in English, "Widgets" and "Publish now" among them; the theme's
  dictionary (`src/moteur/catalogue-bo.fr.ts`) completes them through an alias
  on the module the admin page reads its catalogue from, without forking the
  package, without touching the rendered page, and without ever contradicting
  a message EmDash has translated. A self-check reads the real catalogues and
  fails on a single uncovered message or a dead entry. Measured on the
  production build: of the 2327 simple messages the admin page carries, the 98
  that remain identical to English are spellings French shares (GitHub, CSS,
  Image, Sections). The texts the theme adds follow the same rule, in French
  and in English.
- **The two native taxonomies, in one rail entry.** EmDash's migration always
  writes `Categories` and `Tags` in English, as data. The seed now declares
  their French translations in the same translation group (`translationOf`),
  so the rail shows one entry per taxonomy, labelled in the language of the
  content, and no second "Categories" can appear beside the first. The English
  rows are left untouched.
- **A dashboard card of the site.** Last published content with a link to its
  editor, version and build time served, "View the site" and "Deploy
  everything", as a house extension of the dashboard.
- **"Deploy everything".** A native EmDash extension with its own page: it
  empties the content caches, calls a Cloudflare Deploy Hook to rebuild the
  prerendered pages (secret `ALOHA_DEPLOY_HOOK`), keeps a log of the clicks,
  and proves a redeployment through `/version.json`. One trigger per minute.
- **Two optional caches, emptied at every publication.** `ALOHA_CACHE_OBJETS`
  (KV or memory) keeps the database reads; `ALOHA_CACHE_ROUTES` (Workers
  Cache or memory) keeps whole managed pages, tagged by collection and purged
  by EmDash at each publication. Proven locally with the memory providers;
  the Workers Cache purge is documented as not yet proven online.
- **A sitemap of the managed pages, rendered on demand** (`/sitemap-contenu.xml`,
  declared in the sitemap index), with the same language alternates as the
  static plan; **images optimised on demand** through the Cloudflare Images
  binding; **the visitor's language redirect** shared by the static Worker
  and the engine's Worker, which leaves the admin and API paths alone.
- **The back office rail.** Active entry, focus ring and phone layout were
  reviewed at 1440 and 390 px in both modes; the rail no longer hides its
  last entries at 1440 px, a side effect of the leaked stylesheet above.
- `DEPLOY.md` gains "First deployment of the engine": storage, build, deploy,
  secrets, first administrator, API token, import, verification.

## 2.3.0 - 2026-09-15

- Optional editorial back office using the common Aloha shell based on Kai.
- Article creation, editing, deletion, search and sorting; category creation, editing, ordering and deletion.
- Atomic Git writes detect concurrent edits and protect categories still used by posts.
- A public read-only demonstration exposes the interface without allowing writes, even if an authentication service is configured accidentally.
- Buyers can configure their own Cloudflare, GitHub, Turnstile and Resend services. Existing Aloha authentication service bindings remain supported.
- Drafts no longer generate public routes. A protected build manifest confirms the saved article version after deployment.
- Image downloads reuse verified cached files; clean installations still fetch their own images.
- Real private-preview article create/update/delete, category ordering and automatic build confirmation verified. Standalone authentication is covered by automated SQLite and provider-mock tests.

## 1.9.1 - 2026-09-15

- Family release number aligned with the Kona variant-price correction. No runtime change in this theme.

## 1.9.0 - 2026-09-15

- A malformed language cookie no longer interrupts the demo Worker. It falls back to the browser language.
- Languages explicitly refused with quality zero, or invalid quality values, no longer trigger a redirect.
- A network-free regression check covers cookies, language priority, assets, existing language paths and cache headers.

## 1.8.0 - 2026-09-13

Three family-wide changes to what the crawler reads, none visible in a
browser.

- **The favicon is declared as it is built.** `scripts/favicon.mjs` packs 16,
  32 and 48 into the ICO and writes `favicon-96.png` at every build, but the
  head declared the ICO as `sizes="32x32"` and never mentioned the PNG. The
  ICO link now says `16x16 32x32 48x48`, and a second link declares the 96
  pixel PNG. Google only shows a favicon it can crawl as a raster image, and
  `sizes` has to tell the truth about its file.
- **The sitemap re-reads the hreflang of the built HTML.** `@astrojs/sitemap`
  paired languages by path identity and wrote no `x-default`, while the head
  carries one on every page. The `serialize` hook now reads the
  `<link rel="alternate" hreflang>` tags of each page in `dist/` and writes
  those, `x-default` included; a page without them keeps the integration's
  own pairing. On the demo, 54 entries and 54 `x-default`.
- **A GitHub Actions workflow, `.github/workflows/verifier.yml`,** replays the
  buyer's path (frozen install, check, build, test, house lint) on every push
  and pull request. A branch gets the same guard as `main` before it is
  merged.

## 1.7.3 - 2026-09-07

Two family-wide image and font defects, both found by measurement and both
invisible in the code.

- **The hero srcset gained an 800 breakpoint.** The list ran
  `[720, 1200, 1920, 2560]` with `sizes="100vw"`. A 412-point phone at 1.75
  device pixels per point asks for **721** pixels: one more than 720, so the
  browser climbed to the 1200 candidate and paid over a hundred kilobytes for
  a single pixel. The same arithmetic hits a 390-point phone at 2x, which asks
  for 780. An 800 breakpoint catches both and costs the others nothing.
- **The hero is served as AVIF, with WebP as the fallback.** A first-screen
  photograph carries grain and detail, which WebP encodes badly: on Nalu the
  same image went from **186 KB to 42 KB** at identical quality. The
  `<picture>` keeps WebP for browsers that do not read AVIF, so nobody loses.
  `fallbackFormat="webp"` is MANDATORY here: without it Astro builds a PNG
  fallback per breakpoint, close to twenty megabytes of files nobody will ever
  download but that ship on every deploy.
- **Both font files are preloaded.** The `@font-face` rules travel in the
  inlined stylesheet, so the browser only discovers the woff2 after reading
  the CSS: it paints with the fallback face, then swaps. On Kona that swap
  moved the first screen by **0.168 of CLS**, over the 0.1 threshold, because
  its `h1` is bounded in `ch` (a unit that depends on the active font) inside
  a block centred with `my-auto`. Preloading removes the whole class of
  defect, not just the instance of the day. `crossorigin` is mandatory on a
  font preload, or the file is fetched twice.

Measured on the seven demos, Lighthouse mobile, served compressed: Kona 92 to
99, Nalu 93 to 99, Swell 97 to 98, the others unchanged at 98 or 99.
Accessibility, best practices and SEO stay at 100 on all seven. CLS is at or
under 0.003 everywhere, against 0.168 on Kona before.

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
- The bench stopped changing its mind. It measured 400 ms after its scroll
  pass and hoped that was enough; on a loaded machine it reported "no h1 on
  the page" for pages whose title measured 208 by 54 pixels, on different
  routes at every run. It now waits for a condition instead of a delay: fonts
  arrived, document height and first title box unchanged from one frame to the
  next, and a title that exists in the document has a box. A page that really
  has no h1 answers immediately and is still reported. It also measures five
  widths instead of three: 1024 is the `lg` breakpoint, where a grid goes to
  two columns with the least room to do it, and 1280 is the commonest laptop.
  Neither is coming back out.
- The stylesheet travels inside the HTML (`build.inlineStylesheets: "always"`).
  Lighthouse measured 730 ms of render blocking before the first pixel on the
  demo, from stylesheet requests alone. The trade is written out in
  `astro.config.mjs`, and one word puts it back.
- The demo posters are served by the site. They were fetched from the video
  host, which delivered them and set two third-party cookies on the way: the
  demo's best practices score was capped at 77 for that alone, and the largest
  image on the page depended on a domain the theme does not control. The
  source now lives in `src/assets` and both crops are built. The video stays
  remote, and still loads only on scroll.
- Measured on the demo, mobile, served compressed, before and after:
  best practices 77 to 100, since nothing third-party is fetched any
  more; accessibility to 100; three render-blocking stylesheet requests down
  to zero; first paint and largest paint both earlier on every theme.

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
- In Aloha, `SplitReveal` reveals a title word by word behind a mask, and that
  mask kept cutting descenders, accents and the last glyph of every word once
  the word had landed. It is now lifted the moment the motion ends. The same
  release keeps the second hero button of Aloha inside its glass between 1024
  and 1280 px. Neither fix reaches THIS theme: it does not carry `SplitReveal`,
  and its demo was measured the same way and has no such overflow.
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
