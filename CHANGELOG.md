<!-- CHANGELOG.md - ce qui a change dans Reef, version par version. -->

# Reef - changelog

Versions describe the features actually shipped in this theme.

Current version: **3.8.3**.

## 3.8.3 - 2026-09-29

A step towards a blog run entirely from the back office: posts pick their author
and topic by name, carry real tags with their own pages, and the newsletter is
built in, with no outside service.

- « Auteur » and « Sujet » of a post are chosen by name in a list (a native
  EmDash `reference` field, shown by the house field of the shared base 1.8.0)
  instead of a list of identifiers. A new author or topic appears in the list
  at once, with no schema change. Old values (addresses) are still read.
- Tags are EmDash's native `tag` taxonomy: the « Classement » panel of a post
  (type a tag, Enter), the « Étiquettes » screen to rename them, one page per
  tag at `/tags/<tag>/` (paginated, in both languages, same address), links
  from the post footer, and the sitemap. The old « Mots-clés » field is kept
  in the database but no longer shown.
- Newsletter (shared base 1.8.0, Emails extension): the "Subscribe" forms sign
  readers up with double opt-in, a « Lettre d'information » screen lists the
  subscribers and sends a published post to all of them in their language, in
  one click, and every email carries an unsubscribe link and the
  `List-Unsubscribe` headers. No outside service; sends count in the monthly
  email allowance. Until emails are connected, the forms behave as before.
- Database: `import-3.8.3-reef.sql` (plan with `node scripts/base-3.4.0.mjs
  --remote reef-moteur --sql import-3.8.3-reef.sql`, then `--appliquer`, after
  3.8.1 and 3.8.2): author and topic fields, their values, tags from the old
  keywords (once), newsletter tables. Idempotent, no DELETE, no DROP.
- Static build: identical to 3.8.2 except what was added on purpose (the tag
  pages, the tag links of each post, the sitemap).
- Newsletter unsubscribe: the link at the bottom of each email now opens a
  confirmation page (« Me désinscrire », « Garder mon abonnement », French
  and English), so a mail scanner that opens links no longer unsubscribes
  anyone. The unsubscribe button of mail apps (RFC 8058) stays one click.
- Block screens (shared base 1.8.0): each block screen now also hides the
  text fields and the list of items that do not change that block (measured
  field by field on the published pages; nothing is removed, and a block
  that is not on the map keeps all its fields).

## 3.8.2 - 2026-09-29

The family moves to 3.8.2 together: every theme now lets the client choose,
from the back office, the site font, the position of each home page block and
a logo for dark mode (Reef already had the first two since 3.8.1).

- « Logo pour le mode sombre », in « Réglages par langue » (one image for both
  languages): shown instead of the logo when the reader uses the dark display,
  in the bar and the footer; empty, the logo of the « Paramètres » is used on
  both, as before.
- Database: `import-3.8.2-reef.sql` adds the field (plan with `node
  scripts/base-3.4.0.mjs --remote reef-moteur --sql import-3.8.2-reef.sql`,
  then `--appliquer`); idempotent, no DELETE, no DROP.
- Static build unchanged; anonymous HTML unchanged while the field is empty.
- Shared base: branch `univers-3.8.2-essai` of `aloha-socle` (logo for dark
  mode read by `identite()`, two shared steps in the replayed guide).
- The back office shows, on each block screen, only the photo and video
  fields that change that block (the others are hidden, nothing is removed),
  says what an empty dark mode logo or sharing image does, names an empty
  list « Réglage d'origine du thème » and no longer shows « 0 » in an emptied
  « Place du bloc ». Shared base 1.7.0.

## 3.8.1 - 2026-09-29

Two more settings in the back office, so that a blogger runs the look of the
site without code. The static build is byte-identical to 3.8.0, and an empty
field renders the site exactly as before.

- « Police du site » (in « Réglages par langue », for both languages): the
  theme's fonts, « Police du système, la plus légère », « Classique, à
  empattements » or « Titres classiques, texte sans empattements ». The three
  choices are system font stacks already installed on the reader's device:
  nothing to download, and the theme's two font preloads are dropped when one
  is chosen.
- « Place du bloc sur l'accueil » (each block of « Textes des pages »): a number
  moves the block, 1 at the very top; empty keeps the theme's order. Hiding a
  block works as before.
- Both come from the shared base (extension `administrable`: `typographie.ts`,
  `ordre-des-blocs.ts`, with their selfchecks); `theme.ts` names Reef's font
  tokens (`VARIABLES_DE_POLICE`).
- Database: two new fields. `node scripts/base-3.4.0.mjs --remote reef-moteur
  --sql import-3.8.1-reef.sql` shows the plan, `--appliquer` adds the two
  columns then the two fields; idempotent, no DELETE, no DROP, no content
  touched.
- Shared base 1.6.0 (the two settings above, now on its main line, and
  `scripts/socle.mjs`, which learns `--seulement`).
- The guided replay (`scripts/essai-administrer.mjs`) gains the two gestures:
  16 of 16 done through the interface, seen by an anonymous visitor, undone.
- README: Reef presented as the sober blog CMS for Astro it has become, with a
  table of what a blogger can and cannot do yet from the back office. Guides
  (docs/administrer.md, docs/administer.md) updated.

## 3.8.0 - 2026-09-29

Pages served from a light front Worker with a versioned cache: no more slow
wake-ups. The family moves to 3.8.0 together (there is no 3.7). The static
build is byte-identical to 3.6.2.

- Online, the domain now points to `reef-frontal`, a small Worker (shared base
  module `frontal`) that serves the files, the redirects and the pages already
  kept, and wakes the engine only for a page not kept yet, the admin and the
  API. An editor, or any session, always goes to the engine and is never
  cached; a publication changes the content version, so the cache key.
- Deploy and roll back: `bash scripts/deployer-frontal.sh` (the engine without
  a domain, then the front Worker with the domain) and `--retour` (the domain
  back on the engine). Every release deploys both Workers; the engine is never
  deployed with `--domain` again.
- Docs: DEPLOY.md and docs/moteur.md describe the two Workers, the first
  deployment (engine without a domain, then the front Worker) and the roll
  back; DEPLOY.md names the "Update the site" button by its name. The base
  adapter carries its front Worker note once instead of three times; the
  1.7.3 entry joins the archive (400-line ceiling); the wiki lists the home
  sections the page really shows. The database does not change.

## 3.6.2 - 2026-09-29

The brand colour now paints buttons too. A colour chosen in the admin
(« Bleu océan »...) coloured only the accent (links, highlighted word), while
the filled buttons took the theme's second ramp, turned 181 degrees: « Bleu
océan » gave orange buttons. The reef ramp now takes the named hue, in light and
dark, and every button keeps its text at 4.5:1 or more (measured in Chrome on
every covered page, five colours, light and dark). With no colour chosen
(« Couleur d'origine du thème » or empty) nothing changes: the static build and
the anonymous HTML are identical to 3.6.1.

- `src/moteur/theme.ts`: the button ramp on the named hue, no rotation.
- `src/moteur/site.selfcheck.ts`: the button colours are checked against the colour name, light and dark.
- Admin guides: the colour sentence says it paints the buttons, the links and the highlighted word.

## 3.6.1 - 2026-09-29

Docs read again against the code, repositories cleaned. The static build is
byte-identical to 3.6.0.

- README: 54 pages (not 55), dependencies recounted, the docs list names
  docs/moteur.md and the admin guides; AGENTS.md says which files come from
  the shared base.
- Admin guides: the English guide (`docs/administer.md`) catches up with
  the French one of 3.6.0 (empty photo field, corrected button address, French
  menu links, hidden settings, "Update the site", the theme's original colour,
  what a revision does not restore, emails: this month, mailbox addresses
  refused as sender, the red card); both guides say a block saves on its own,
  a new page is created in English then translated, and to replace the demo
  contact details first.
- Docs: "Tout déployer" renamed "Mettre le site à jour" wherever the docs
  name the button; docs/moteur.md and DEPLOY.md give the 3.6.0 step for an
  online database (`import-3.6.0-reef.sql`); docs/design.md no longer
  describes a wave under the accent word; the README counts are recounted on
  the source and the build.

## 3.6.0 - 2026-09-29

What a client could not do alone in the admin (UX test of 3.5.0), fixed in the
shared base 1.4.0. The static build is byte-identical to 3.5.0.

- "Update the site" (was "Deploy everything") speaks to the client; the
  technical details fold under "For the person who installed the site".
- A button address typed as `www.example.com` is corrected to `https://...`;
  a French menu link typed without `/fr/` leads to the French page.
- Brand colour: every colour keeps button text readable (4.5:1, measured), and
  "Couleur d'origine du thème" returns to the theme's colour
  (`import-3.6.0-reef.sql` for an online database).
- Admin in plain French: the editing bar and its photo window, "(facultatif)",
  relative dates, useless settings hidden, what a revision restores.

## 3.5.0 - 2026-09-29

Shared base (Aloha Pixel socle) 1.3.0. No visible change for a visitor on the
static build.

- Brand colour: each of the five colours now gives the hue its name says
  ("Ocean blue" was pink). Only a site with a chosen colour changes.
- A post published with an empty body no longer takes the pages down.
- The phone frame on the About page shows again with the engine on (it was
  checked on a disk the Worker does not have).
- Free pages: spacing no longer relies on utilities the theme does not ship.
- Tools: the guide replay (`scripts/essai-administrer.mjs`) is shared, with
  Reef's own steps in `scripts/essai-administrer.site.mjs`; the edit-bar
  coverage counts interface text, token phrases and the rich-text editor; the
  upgrade SQL aligns media and no longer copies extension tables; Tailwind no
  longer reads `docs/`.

## 3.4.0 - 2026-09-28

The whole site is managed from the EmDash back office: menus, site settings,
posts per page, topics, authors, footer, links, images, SEO, new pages; the
edit bar works on every page, the not-found page included.

- Native menus (header, phone drawer, the "Subscribe" button, the three
  footer columns), one per language; site name, logo, favicon, social links,
  title separator, default share image, verification codes and posts per page
  from the native settings; a per-language `site` entry (description, contact
  email, credit, RSS title, form endpoints, brand colour among five).
- Topics and authors become collections (`sujets`, `auteurs`), seeded from
  `src/data`: name, description, colour, rank, portrait, links, SEO panel.
  The SEO panel of posts is read (title, description, image, canonical, no
  index; no index leaves the sitemap).
- Every block of `sections` gains button addresses, a photo, a video and its
  poster, a breadcrumb name, a share image and a "hide this block" switch;
  texts wrongly shared between two places get their own field. Empty fields
  render the theme exactly as before.
- Free pages (`pages` collection) at `/<slug>/` and `/fr/<slug>/`; the
  not-found page is rendered on demand and editable.
- The Courriels module: the contact form's messages are sent by email,
  with a log and a setup screen, from the back office.
- The back office language rule is called from the Worker; the transition
  middleware is gone.
- Performance: no layout shift when the header measures itself (CLS 0.06 to
  0), a 1440 px step for the hero, the post cover and the first card of a list
  loaded first.
- A post with no text no longer breaks every page (engine on).
- `import-3.4.0-reef.sql` and `scripts/base-3.4.0.mjs` bring an online
  database to 3.4.0 without overwriting anything an editor changed.
- Editor guides: `docs/administrer.md` (French) and `docs/administer.md`.

Engine off, the static build changes only by the performance work above.

## 3.3.3 - 2026-09-28

Version number aligned with the Aloha Pixel family (3.3.3: screenshots on
alohapixel.com and Holo re-shot without the wave, prices with cents formatted
with both digits in Kai, Kona and Nalu). No functional change in this theme.

## 3.3.2 - 2026-09-28

The phone mockup on the home page (`public/reef-iphone-poster.webp`) is
re-shot from the 3.3.1 demo: the picture inside the drawn phone no longer shows
the wave under the accent word. Regenerate it yourself after any change with
`pnpm build && pnpm poster`. Nothing else changes; same number, 3.3.2, on every
repository of the Aloha Pixel family.

## 3.3.1 - 2026-09-28

No more wave under the accent word of a title. Rule of the house, stated by
the publisher on 28 September 2026: no decorative stroke under a title, on any
theme or site. `.accent-script` keeps the heading font and the primary colour,
nothing else; `--accent-wave` leaves `tokens.css` and `global.css`, and the
docs (design.md, conventions/tailwind.md, THIRD-PARTY.md, wiki) say so. Same
number, 3.3.1, on every repository of the family. Nothing else changes: same
content, same database, no import to replay.

## 3.3.0 - 2026-09-24

Page texts editable from the EmDash bar; the demo finished after its audit.

- The written copy of the pages (home, list headers, footer line, about,
  contact, legal notice, privacy, terms) is a `sections` collection, 26 entries
  per language seeded with the file texts, laid over the dictionary engine on
  (`src/moteur/contenu.ts`). In edit mode titles, accents, eyebrows and
  buttons are edited in the page; the other fields open the back office.
- One back office: the Git-based editor of 2.3 and its footer link are gone.
- Legal notice, privacy and terms describe a blog on a Worker with a database.
- French 404 under `/fr/`; no canonical or hreflang on the 404; `/404`
  answers 404. `/sitemap.xml` 301 to the index, unknown sitemaps 404,
  `robots.txt` disallows `/_emdash/`, no `Server-Timing` for visitors.
- Share-card alt text and RSS title per language; no placeholder author
  links; no "theme by" credit next to the demo line; back office named from
  `siteData.name`, its French catalogue without em or en dashes.
- The docs say the live demo runs with the engine (Worker `reef-moteur`). A
  database deployed before 3.3.0 is updated by `seed/import-3.3.0-reef.sql`.

## 3.1.3 - 2026-09-24

The EmDash edit bar now finds what it edits.

- **Edit mode had nothing to edit.** With the engine on, a signed-in editor
  saw the "EmDash | Edit" bar, but switching "Edit" on did nothing: turning a
  database entry into a `posts` entry dropped EmDash's `edit` proxy, so no tag
  carried `data-emdash-ref`. The proxy now travels with the post, in edit
  mode only, and `annotation()` from `@moteur/source`
  (`src/moteur/annotations.ts`, with its selfcheck) marks what each template
  shows.
- **Edited in the page**: the title, on the post page, the cards, the
  featured post, the search results and the previous and next links; the
  cover opens EmDash's image picker. **Opened in the back office**: the
  standfirst, at its field. The body keeps EmDash's own inline editor. A save
  stores a draft; "Publish" puts it online.
- **Nothing changes for a visitor**: engine off, the static build is
  identical file by file; engine on, the anonymous HTML is identical byte
  for byte. See docs/moteur.md, "The edit bar, on the site".
- Family release number 3.1.3, the same on the seven themes.

## 3.1.2 - 2026-09-24

Engine images at build quality, a real share card for every post, and a
sitemap that no longer lists the search page.

- **The first-screen image is encoded at quality 75**, in AVIF as in WebP, in
  both modes: at sharp's AVIF default of 50 the photo's texture smeared.
- **On-demand images at the build's quality.** With the engine on, the pages
  rendered on demand sent their images through `/_image` with no `q`
  parameter, and the Cloudflare Images binding then encodes almost
  losslessly: the demo's lead image weighed 569 KB at 390 px and 1.5 MB at
  1440 px online, where the static build ships the same image at 100 to
  200 KB. `src/moteur/service-image.ts`, aliased onto the adapter's image
  service (engine on only), now writes the quality sharp applies at build
  time into every address: 80 for WebP and JPEG, 50 for AVIF. A declared
  quality stays its own. `qualite-image.selfcheck.ts` compares the table
  with the defaults of the installed sharp. The static build does not read
  this file, and the prerendered files of the engine build are unchanged.
- **Every post shares a JPEG card, 1200x630.** A post with a cover used to
  give the cover itself as `og:image`: a WebP at its original size, up to
  556 KB and sometimes portrait (1200x1500). The card is now the cover
  cropped to 1200x630 JPEG, in both modes: at build time by sharp (position
  "attention", like `scripts/og.mjs`), and with the engine on by a new route,
  `/og/billet/<key>.jpg` (`src/moteur/carte-du-billet.ts`), which reads the
  cover from the media library and crops it with the Images binding. EmDash's
  own `/_image` endpoint could not do it: for a media file it passes the
  width and height but not `fit`, so a portrait cover came out 504x630. A
  post without a cover, or a card that cannot be made, shares
  `/og/default.jpg`. The schema.org `image` of the article keeps the whole
  cover.
- **The search page leaves the sitemap.** `/search/` and `/fr/search/` are
  `noindex, nofollow` and disallowed in `robots.txt`, but both sitemaps
  listed them. They are now excluded from the static sitemap
  (`astro.config.mjs`) and from the engine's `/sitemap-contenu.xml`
  (`src/moteur/plan-du-site.ts`); their `noindex` is unchanged.
- Family release number 3.1.2, the same on the seven themes.

## 3.1.1 - 2026-09-23

The share cards become a photograph and nothing else, made at build time.

- **One card, one photograph.** The Open Graph and Twitter image is now a
  plain crop of the home page hero photograph (`src/assets/reef-hero-vague.webp`,
  Pexels, already listed in `PHOTOS.md`): no gradient, grid, eyebrow, title,
  wave or domain drawn on it. The platform already writes the title and the
  domain under the preview, from `og:title` and `og:url`.
- **Made by the build, no longer versioned.** `pnpm build`, `pnpm build:moteur`,
  `pnpm app` and `pnpm dev` run `scripts/og.mjs` right after `scripts/covers.mjs`:
  sharp, 1200x630, "attention" crop, JPEG quality 86. `public/og/` is ignored
  by git, and replacing the hero photograph replaces the card at the next
  build, with no rebrand step and nothing to commit.
- **What changes for you.** The default card is now `/og/default.jpg`
  (`siteData.defaultImage`); the five PNG cards are gone, and the four that no
  page referenced (blog, topics, about, contact) are not rebuilt. If you
  pointed a page at one of them, add a line to `CARTES` in `scripts/og.mjs`
  (a slug and one of your photographs) and point the page at that `.jpg`. A
  post with a cover still shares its cover.
- Family release number 3.1.1, the same on the seven themes.

## 3.1.0 and before

Moved to `CHANGELOG-ARCHIVE-1.x.md` (400-line ceiling of the house): 1.9.0 and older on 28 and 29 September 2026, 3.1.0, 2.3.0 and 1.9.1 for 3.8.3.
