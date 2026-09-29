<!-- README.md - the front page of the repo: what Reef is, what it contains, how to run it, what to do before deploying. -->

<p align="center">
  <img src="https://alohapixel.app/screenshots/theme-reef.webp" alt="Reef, a free bilingual blog theme for Astro: the home page hero, shown on desktop" width="720">
</p>

<h1 align="center">Reef</h1>

<p align="center">
  <b>A sober, bilingual blog for Astro 7 that you run from its back office.</b><br>
  A static theme with no server by default; with the optional EmDash engine,<br>
  a blog CMS where posts, pages, menus, fonts, colours and the home page layout are set by the editor.
</p>

<p align="center">
  <a href="https://reef.alohapixel.app"><b>Live demo</b></a>
  &nbsp;·&nbsp;
  <a href="https://reef.alohapixel.app/fr/">Version française</a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick start</a>
  &nbsp;·&nbsp;
  <a href="https://alohapixel.app/themes/">The rest of the family</a>
</p>

<p align="center">
  <img alt="Astro 7" src="https://img.shields.io/badge/Astro-7-BC52EE?style=flat-square&logo=astro&logoColor=white">
  <img alt="Tailwind CSS v4" src="https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white">
  <img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="English and French" src="https://img.shields.io/badge/i18n-EN%20%2B%20FR-1D7F8D?style=flat-square">
  <img alt="Free" src="https://img.shields.io/badge/price-free-FF7A59?style=flat-square">
</p>

---

Reef is two things from one source, MIT licensed and free.

- **A static blog theme.** `pnpm build` writes plain HTML: a home that leads
  with the latest piece, a paginated blog, topic and author pages, a reading
  column with a table of contents, a per-language RSS feed, in English and in
  French. No server, no adapter, no database.
- **A blog CMS.** With `ALOHA_MOTEUR=emdash` the same source builds as a
  Cloudflare Worker on [EmDash](https://github.com/emdash-cms/emdash) 0.38
  (MIT), the CMS for Astro that runs on Workers, D1 and R2. Posts live in the
  database, publishing shows on the site with no rebuild, and the whole visible
  site is set from the back office at `/_emdash/admin`, in French by default
  (English one setting away). The live demo, `reef.alohapixel.app`, runs this
  way.

The demo publication is Reef Notes, a fictional three-person web studio's
notebook. Every word lives in the back office, in a typed dictionary or in a
Markdown post, never inside a component.

## A blog you run from the back office

What a blogger expects from a sober WordPress, and where it stands in Reef
3.8.1 with the engine on. "Partly" and "Not yet" are said as they are.

| You want to | In Reef | Where, in the back office |
|---|---|---|
| Write posts, keep drafts, go back to a revision | Yes | "Articles": title, lead, cover, rich text, date, featured, SEO panel |
| Add pages | Yes | "Pages": served at `/<address>/`, then added to a menu |
| Show authors | Partly | "Auteurs": name, role, bio, portrait, links. On a post, the author is picked from a list of identifiers, not of names |
| Sort posts into categories and tags | Partly | One topic per post ("Sujets": name, description, colour, rank). Tags are a raw list field; EmDash's own taxonomies are not wired |
| Comments | Not yet | None on the site, on purpose. EmDash 0.38 has a moderation screen, not connected |
| Edit menus | Yes | "Menus": main bar, phone menu, buttons, three footer columns, per language |
| Footer widgets | Partly | The footer columns are menus and its texts are editable; EmDash's widget areas are not used |
| Site name, logo, favicon, description, share image | Yes | "Paramètres" and "Réglages par langue" |
| Choose a typeface | Yes (3.8.1) | "Réglages par langue", « Police du site »: the theme's fonts, or one of three system font stacks (nothing to download) |
| Choose colours | Yes | « Couleur de la marque »: the theme's colour or one of five, each keeping button text at 4.5:1 contrast or more |
| Arrange the home page | Yes (3.8.1) | Each of the eight blocks can be hidden, and given a place (« Place du bloc sur l'accueil ») |
| Social links | Yes | "Paramètres", social: X, GitHub, Facebook, Instagram, LinkedIn, YouTube (the list EmDash 0.38 offers), in the footer and the JSON-LD |
| SEO | Yes | Per entry: title, description, share image, canonical, noindex; site-wide: title separator, Google and Bing verification |
| RSS feed | Yes | One per language; its title in "Réglages par langue" |
| Sitemap | Yes | Rendered on demand; a noindex entry leaves it |
| Emails | Yes | Contact form messages sent and logged by the house Emails screens (Cloudflare `send_email` binding) |
| Newsletter | Partly | The signup form posts to an outside service whose address you set; no built-in list or sending |
| Redirects | Yes | "Redirections" (EmDash, 301) |
| Media | Yes | EmDash's media library, stored in R2 |
| Posts per page | Yes | "Paramètres", general |

An empty field always renders the theme as shipped. `scripts/essai-administrer.mjs`
replays sixteen of these gestures in a real browser, through the interface
only, checks each one as an anonymous visitor, then undoes it. The editor's
guide is [docs/administrer.md](docs/administrer.md) (French) and
[docs/administer.md](docs/administer.md) (English).

## Back office (EmDash)

The engine is off by default: without `ALOHA_MOTEUR=emdash` nothing of it is
bundled and the static build is unchanged (3.8.1 included: its static build is
byte-identical to 3.8.0's).

With the variable set, the demo is served by the **reef-moteur** Worker
(EmDash engine, D1 `reef-moteur`, R2 `reef-moteur-media`), built with
`pnpm build:moteur` and deployed with `bash scripts/deployer-frontal.sh`,
behind a light front Worker that serves the pages already kept (see
[DEPLOY.md](DEPLOY.md)).

- **A complete back office at `/_emdash/admin`** (and `/secret-spot/` redirects
  there). Posts live in D1, media in R2, and the pages that show a post are
  rendered on demand, so publishing is visible on the site with no rebuild.
- **French by default, entirely.** EmDash 0.38 still leaves part of its French
  catalogue in English; the theme's dictionary (`src/moteur/catalogue-bo.fr.ts`)
  fills every message left, without forking the package, and a selfcheck
  fails if one is missing. `ALOHA_BO_LANGUE` changes the default (`en`, or
  `navigateur` to follow the browser), and each person can override it in
  their settings.
- **EmDash's native backgrounds**, white in light mode and black in dark mode.
  The theme only brings its accent colour, fonts, logo and site name.
- **An edit bar on the site itself**: an editor signed in edits a title or a
  photo on the page, and the fields a text cannot show (button addresses,
  hiding a block) sit next to it as small labels.
- **"Mettre le site à jour"**, a button that empties the caches and rebuilds
  the prerendered pages through a Cloudflare Deploy Hook.

```bash
pnpm dev:moteur                                              # back office at http://localhost:4321/_emdash/admin
node scripts/moteur-import.mjs --url http://localhost:4321   # pours the Markdown posts into the database, once
pnpm build:moteur                                            # the Worker build
```

How it is wired: [docs/moteur.md](docs/moteur.md). Putting it online, step by
step: "First deployment of the engine" in [DEPLOY.md](DEPLOY.md).

The six paid themes carry the same EmDash back office:
https://alohapixel.app/themes/

## What is in the box, counted from this repo

Numbers below were counted from the source and the build, not estimated
(recounted on 2026-09-29 for 3.6.1; the static build of 3.8.0 and 3.8.1 is
byte-identical to it, 54 HTML pages counted again for 3.8.1; `pnpm build`
green, `pnpm check` clean).

| What | Count |
|---|---|
| Pages emitted by `pnpm build` | 54 |
| Plain-text endpoints | robots.txt, llms.txt, per-language rss.xml, sitemap-index.xml |
| Content collections (zod validated) | 3 (posts, authors, topics) |
| Demo content entries | 9 posts (one of them a draft), 3 authors, 5 topics, in 2 languages |
| UI primitive families (src/components/ui) | 36, across 63 .astro files |
| Primitive files that need a script tag | 10 of 63; the rest are pure HTML and CSS |
| Section components | 27 |
| Original hand-drawn icons | 60 |
| animate-* utilities (motion catalog + brand tokens) | 55 + 3 |
| Languages, from one page source each | 2 (English at the root, French under /fr/) |
| Runtime dependencies | 16, 6 of them only for the optional engine (@astrojs/cloudflare, @astrojs/react, react, react-dom, emdash, @emdash-cms/cloudflare); every one listed in THIRD-PARTY.md |

## Why it feels expensive

- **Almost no JavaScript.** Dialogs are native `<dialog>`, accordions are
  native `<details>`, the marquee is pure CSS. The scripts that ship are the
  mobile drawer, the theme switch, the shrinking navbar and the reader's table
  of contents, and all of them survive view transitions.
- **A design system, not a stylesheet.** One file (src/styles/tokens.css)
  defines the palette, semantic roles and generated utilities. Markup only
  speaks roles (bg-primary, bg-card, text-muted-foreground), so
  `pnpm rebrand "#yourhex"` repaints the theme, the favicon and the share
  cards from a single colour.
- **An owned SEO layer.** Canonical, Open Graph, JSON-LD builders, robots.txt,
  llms.txt, a per-language RSS feed and the sitemap are hand-written, readable
  files in the repo, not a plugin.
- **Two themes, not one switch.** Semantic tokens invert under one `.dark`
  class, applied before first paint, with zero flash. Light and dark do not
  share a shadow recipe: dark swaps cast shadows for luminous borders.
- **Bilingual by construction.** One page source per route, one output per
  language, one post file per language under the same slug. The dictionary is
  a typed object, so a missing French key is a build error, not a silently
  English sentence in production.
- **Accessibility as a feature.** 44px touch targets, correct aria wiring,
  visible focus everywhere, and reduced motion honored at both the CSS and the
  scroll-timeline layer.

## Stack

Astro 7 (static output, no adapter), Tailwind CSS 4 (CSS-first, no config
file), tailwind-variants, @astrojs/mdx (Markdown and MDX posts) and
@astrojs/sitemap, self-hosted fonts via Fontsource (Space Grotesk, Instrument
Sans, both OFL); the accent word of a heading keeps the heading font and only
changes colour, so no third font loads. Node >= 22.18 and pnpm. No
React, no animation library, no WebGL on the public site. The optional
publication engine adds the Cloudflare adapter, EmDash and React to ITS build
only; React carries EmDash's back office and no public page gains an island.

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:4321
```

`pnpm dev` fetches the demo photographs into `src/assets/` before the server
starts, because the repository does not version them.

All commands:

```bash
pnpm dev          # dev server
pnpm build        # static site into dist/
pnpm preview      # serve the build locally
pnpm check        # astro check (types and templates)
pnpm rebrand "#7a59ff"   # repaint the theme from one brand color
pnpm rebrand --restore   # back to the Reef palette
pnpm og           # crop the share cards into public/og/ (the build does it too)
pnpm app          # build tuned for a native Capacitor shell
pnpm dev:moteur   # the same site with the publication engine on (docs/moteur.md)
pnpm build:moteur # the Worker build: managed pages on demand, the rest prerendered
pnpm test         # the selfchecks, plain Node, no framework
pnpm lint:house   # the mechanical house rules

# selfchecks, plain Node, no framework:
node src/js/schema.selfcheck.ts
node src/js/pagination.selfcheck.ts
```

## Structure

```text
src/
  components/
    ui/         36 primitive families (button, dialog, tabs, reveal, ...)
    Sections/   24 sections, grouped by page (Home/, Post/, Archive/, Search/, Global/, Legal/)
    svg/icons/  the 60-icon original set
  config/       typed site data: siteData, navData, legalData
  content.config.ts  the posts, authors and topics collections, zod schemas
  data/         your content: posts (Markdown/MDX), authors and topics (JSON)
  i18n/         the bilingual layer: config, helpers, en/ and fr/ dictionaries
  js/           pure logic: JSON-LD builders, pagination, text utils
  layouts/      BaseLayout + BaseHead (the entire <head>, hand-written)
  pages/        [...locale]/ (index, blog, topics, authors, about, contact, legal), 404, robots, llms, rss
  styles/       tokens.css, global.css, prose.css, the motion catalog
  moteur/       the optional publication engine: two post sources behind one alias, managed pages,
                on-demand sitemap, back office skin and language, the two house extensions
scripts/        rebrand.mjs, og.mjs, app.mjs, moteur-import.mjs
seed/           seed.json, the engine's schema
wiki/           how the theme works, anchored to the code
docs/           the five convention files, one per subsystem
```

## Make it yours, in order

1. **src/config/siteData.json.ts**: name, title, description, author. This is
   the only file you must edit to change the publication identity.
2. **astro.config.mjs**: set `site` to your production URL. It feeds canonical
   URLs, OG tags, the sitemap, robots.txt, llms.txt and the RSS feed at once.
3. `pnpm rebrand "#yourbrandcolor"`. The share cards need no step: they are
   photographs, cropped by the build from the theme photos (scripts/og.mjs).
4. **src/data/**: replace the demo posts, authors and topics. One Markdown post
   per language under the same slug.
5. **src/i18n/ui/en/** and **src/i18n/ui/fr/**: all the interface copy. Nothing
   displayed lives in a component.
6. **src/config/navData.json.ts** and **legalData.json.ts**: your links, and the
   privacy and terms copy. The bracketed fields to fill in are not there: they
   are in the legal notice, in src/i18n/ui/en/pages.ts and src/i18n/ui/fr/pages.ts.

## Before you deploy

- [ ] `site` in astro.config.mjs points at your real domain.
- [ ] `demoNotice` in src/config/siteData.json.ts is emptied, so the footer
      line saying "this site is a demo of the Reef theme" does not render on
      your site. The demo keeps it; you clear the field, and there is no
      component to open.
- [ ] The share card is YOUR photograph: the build crops public/og/default.jpg
      from the home page hero photo (scripts/og.mjs, run by `pnpm build`), so
      replace that photo, or point the `default` line of scripts/og.mjs at
      yours, and Reef's wave leaves your link previews.
- [ ] Legal copy in src/config/legalData.json.ts reviewed by a human who may
      legally have an opinion, and the bracketed fields of the legal notice
      (src/i18n/ui/en/pages.ts and src/i18n/ui/fr/pages.ts) filled in. It all
      ships as a generic starting point, in both languages, and none of it is
      legal advice.
- [ ] The demo posts, authors and topics replaced with your own.
- [ ] The contact form points at your own endpoint, or is removed. It ships
      with no `action` on purpose (the note is at the top of contact.astro). With the engine on, the contact form goes through the back office's
      Emails screens once they are connected (docs/administer.md).
- [ ] `pnpm check` and `pnpm build` are green, and the selfchecks pass.

Deploy dist/ to any static host: Cloudflare Pages, Netlify, Vercel, an nginx
box. No adapter, no server, no environment variable required. The publication
engine is the one exception, and it is opt-in: its deployment is a Cloudflare
Worker, described step by step in DEPLOY.md.

## Ship it as a native app (Capacitor)

Reef builds to plain static files with no server, no external CDN and local
fonts, which is exactly what Capacitor wraps. Every fixed element respects
`env(safe-area-inset-*)`, viewport heights use `svh` and never `vh`, touch
targets are 44px, and no page overflows horizontally at 390x844.

```bash
pnpm app          # build tuned for a native shell
npx cap add ios
npx cap sync
npx cap open ios
```

`capacitor.config.ts` ships with the theme. The full guide, including the
checklist Apple reviewers care about, is in
[wiki/subsystems/mobile-app.md](wiki/subsystems/mobile-app.md).

## Documentation

- AGENTS.md: the operating manual (conventions, commands, gotchas), binding
  for everyone who works in the repository.
- docs/conventions/: the five convention files (astro, tailwind, typescript,
  motion, seo), each anchored to real files in this repo. They are written to
  be read on day one and followed by anyone who extends the theme afterwards.
- wiki/: start at wiki/overview.md; each subsystem has its own anchored page.
- docs/moteur.md: the optional publication engine: how it is wired, the
  back office, the online data and what was measured.
- docs/administrer.md (French) and docs/administer.md (English): the
  editor's guide, running the whole site from the back office, with no code.
- THIRD-PARTY.md: the complete honest inventory (two OFL fonts, permissive
  npm packages, and the photographs that ship with the demo).

## Questions

Issues are turned off on this repository, and that is deliberate: support for
this theme is handled in one place rather than two.

- Something is wrong with the theme, or you want to tell us it helped:
  https://alohapixel.app/contact/
- The rest of the family:
  https://alohapixel.app/themes/

Pull requests are welcome all the same.

## What the paid themes add

Reef ships the whole foundation: the UI primitives, the typed bilingual layer
with its language switcher, the measured dark mode, the owned SEO, the motion,
the verification scripts and the written conventions. That is
deliberate: it is how you try the house without paying, and for a blog it is
complete.

The six paid themes add the business built on top of that foundation: a shop
with products and a cart, a headless storefront
read from WooCommerce or Shopify, a SaaS site with its pricing page and its
eight-screen dashboard, a launch page with its pricing section. Not one of
those files is in Reef.

The seven themes, side by side, with prices and live demos:
https://alohapixel.app/themes/

## License

MIT, full text in [LICENSE](LICENSE), which holds the MIT text and nothing else
so that GitHub reads it correctly. Use it, fork it, sell what you build with it,
no attribution required. Republishing Reef itself as your own theme is what the
MIT license already allows, so there is nothing to negotiate here.

The photographs are covered separately, and [NOTICE.md](NOTICE.md) says so in
full: the ten photographs in src/assets/ come from Pexels and carry the Pexels
licence, which is free for commercial and personal use, requires no attribution
and allows redistribution. Keep them in the site you publish with Reef, or
replace them with your own; both are inside the licence. scripts/covers.mjs is a
plain list of URLs, and a post with no cover falls back to a typographic card.
PHOTOS.md names the Pexels page of every single file.

NOTICE.md carries the rest of what the MIT grant does and does not reach: the
photographs, the demo content, and the fonts and npm packages inventoried in
THIRD-PARTY.md. Nothing there restricts the MIT grant.

Provided as is, without warranty.
