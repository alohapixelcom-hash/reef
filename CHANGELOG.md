<!-- CHANGELOG.md - what changed in Reef, version by version. -->

# Changelog

## 4.0.0 - 2026-10-13

- Aloha Pixel core 2.0.0 (from 1.16.1). A « Design » page in the back office, under Appearance: the logo and the dark mode logo, the brand colour, the typeface, the size of the main titles, section titles, small titles and body text (Compact, Standard or Generous), the corners (the theme's own, Sharp, Soft or Rounded; buttons stay pills), with a live preview of the home page, light or dark, at desktop or phone width. The choices are saved in the `site` entry of each language. Standard sizes and the theme's own corners write nothing: the public page keeps the theme's exact rendering until someone picks something else.
- The back office sidebar reads in titled sections: the dashboard and Messages first, then Content, Appearance, Emails and Settings; a section with no entry shows no title. The dashboard shortcuts gain « Design ».
- The live sitemap answers fast: the SEO panels of a collection are read in one database query, `/sitemap-moteur.xml` and the index leave with `Cache-Control: public, max-age=300` and are kept five minutes by the front Worker, purged by a publication. EmDash's `Server-Timing` header no longer reaches visitors.
- No SQL to run: the five new fields of the `site` entry are added by the Design page on its first save, through EmDash's schema API.
- The accent word of the titles is written with the primary ink role (`text-primary-text`): turquoise 700 on a light page, the primary itself in dark mode, turquoise 300 on the deep scenes (the photographed bands). On the photograph of the subscription invitation it read at 4.25:1, it now clears the 4.5:1 that WCAG AA asks for text (`pnpm verify`).
- The version moves to 4.0.0 for the whole family, because the order of the sidebar changes for every editor.

## 3.9.0 - 2026-10-12

- Aloha Pixel core 1.16.1 (from 1.10.0). The live sitemap of the `seo` extension: `/sitemap-moteur.xml`, recomputed at every request (frozen pages, managed pages, free pages and dates from the database), the only sitemap of `/sitemap-index.xml`; `/sitemap.xml`, `/sitemap-0.xml`, `/sitemap-contenu.xml` and EmDash's sitemaps answer a 301 to the index. `robots.txt` and `llms.txt` editable in a « SEO » screen of the back office, with a page audit (title, description, headings, canonical, hreflang, structured data).
- Photos sent to the media library converted on upload (`medias` extension: orientation, metadata removed, 2560 px at most, AVIF or WebP), and « Optimiser les photos existantes » on the dashboard.
- Back office: dashboard in tiles, Messages right under it, settings at the bottom of the sidebar.
- SEO: page titles held between 30 and 60 characters when they can be: a short title takes a signature of the brand (« Topics | Reef Notes, a working notebook from a web studio »), a title too long with the brand drops it (`src/js/pageTitle.ts`, `home.titleSignature`). The Organization node of the home page carries a logo.
- The home title is « Reef Notes, a working notebook from a web studio » (61 characters before). The site card of the dashboard gives way to the core's tiles (last publication, shortcuts, sitemap).
- Both Workers have no public address other than the domain (`workers_dev` and `preview_urls` false).
- The static build changes only where intended: the titles and the Organization logo.

## 3.8.5 - 2026-09-30

- Back office, « Messages »: every message of the contact form is kept in the site database before the notification is sent, and can be read, marked read or unread, archived, deleted and answered (Cloudflare Email), with an unread badge in the sidebar (`migrations/import-3.8.5-reef.sql`).
- « Journal des courriels » as a checklist: resend, delete, search, CSV export.
- « Abonnés de la lettre »: search, unsubscribe, resubscribe, delete several subscribers at once, tick the suspicious sign-ups, CSV export.
- Aloha Pixel core 1.10.0 (gestion extension).

## 3.8.4 - 2026-09-30

- Tables in posts are real tables, in the editor and on the site. The demo
  posts of a database already online are corrected by
  `migrations/import-3.8.4-reef.sql`.
- The back office loads under `pnpm dev:moteur` (the addresses of the dev
  server are no longer redirected).
- Help texts of the back office: a new topic or author is picked by name at
  once; the external newsletter field says the built-in newsletter comes first.
- Native app: `capacitor.config.ts` carries Reef's own name and colours,
  `pnpm app` builds the favicons like `pnpm build`, and the guide covers
  installing Capacitor, signing and the stores.
- Repository: SQL migrations in `migrations/`, documentation rewritten for the
  current version.
- Aloha Pixel core 1.9.0 (stock module, reservation at checkout, the front Worker's cache follows the shop tables).

## 3.8.3 - 2026-09-29

- Author and topic of a post are chosen by name.
- Tags use EmDash's native taxonomy, with one page per tag.
- Built-in newsletter: double opt-in signup, subscriber list, one-click sending
  of a published post, unsubscribe through a confirmation page.
- Shared base 1.8.0.

## 3.8.2 - 2026-09-29

- « Logo pour le mode sombre » in « Réglages par langue ».
- Shared base 1.7.0.

## 3.8.1 - 2026-09-29

- « Police du site »: the theme's fonts or one of three system font stacks.
- « Place du bloc sur l'accueil »: each home block can be moved.

## 3.8.0 - 2026-09-29

- Online, a light front Worker serves the pages from a versioned cache, in
  front of the engine Worker; `scripts/deployer-frontal.sh` deploys both.

## 3.6.2 - 2026-09-29

- The brand colour chosen in the back office also paints the buttons, with
  text contrast kept at 4.5:1 or more.

## 3.6.1 - 2026-09-29

- Documentation checked against the code.

## 3.6.0 - 2026-09-29

- Back office wording and screens simplified for non-technical editors.
- « Couleur d'origine du thème » added to the brand colours.

## 3.5.0 - 2026-09-29

- Brand colours give the hue their name says.

## 3.4.0 - 2026-09-28

- The whole site is managed from the back office: menus, settings, posts per
  page, topics, authors, footer, images, SEO, new pages.
- Contact form emails sent and logged by the « Courriels » screens.

## 3.3.3 - 2026-09-28

- Version aligned with the family. No change in this theme.

## 3.3.2 - 2026-09-28

- Phone mockup of the home page re-shot.

## 3.3.1 - 2026-09-28

- No decorative stroke under the accent word of a title.

## 3.3.0 - 2026-09-24

- Page texts editable from the EmDash edit bar.
- Legal, privacy and terms pages written for a blog.

## 3.1.3 - 2026-09-24

- The edit bar finds the post, topic and author it edits.

## 3.1.2 - 2026-09-24

- Engine images encoded at build quality; a share card for every post.

## 3.1.1 - 2026-09-23

- Share cards are a crop of the home page photograph, made at build time.

## 3.1.0 - 2026-09-22

- Optional EmDash publication engine (`ALOHA_MOTEUR=emdash`): posts in D1,
  media in R2, pages rendered on demand.

Earlier versions are listed in the GitHub releases.
