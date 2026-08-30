<!-- THIRD-PARTY.md - the honest inventory of everything in this theme that Aloha Pixel did not create. -->

# Third-party inventory

Everything in Reef that we did not create ourselves is listed here, with its
license and where it lives. If it is not on this page, it was made for this
theme. This inventory is what makes Reef safe to ship and to reuse inside your
own products.

Verified against the repository on 2026-08-30 (packages read from
node_modules metadata, assets listed with find over public/ and src/).

## Fonts

Two typefaces, both delivered as npm packages by the Fontsource project and
self-hosted at build time. No font is fetched from a third-party CDN at
runtime. Both are under the SIL Open Font License 1.1, which permits
bundling, self-hosting and commercial use.

| Typeface | Package | Version | License | Role |
|---|---|---|---|---|
| Space Grotesk (variable) | @fontsource-variable/space-grotesk | 5.3.0 | OFL-1.1 | Display headings (font-display), including the accent word |
| Instrument Sans (variable) | @fontsource-variable/instrument-sans | 5.3.0 | OFL-1.1 | Body text and interface labels (font-sans) |

The imports live at the top of src/layouts/BaseHead.astro. Each package
carries its own LICENSE file in node_modules; the license fields above were
read from the packages' own metadata. The accent word of a big title loads no
extra font: it keeps the heading font, turns the house turquoise and carries a
turquoise wave underline (--accent-wave, an original inline SVG covered by the
theme LICENSE). Coral is the second accent, rationed.

## Icons

None are third party. The 60 icons of the set are original path data drawn
for this theme on a 24x24 grid (src/components/svg/icons/icons.ts, rendered
by src/components/svg/icons/Icon.astro). No icon library is imported, copied
or traced. They are covered by the theme LICENSE.

## Images and photos

The theme ships ten photographs: one full-bleed hero and nine article covers.
They come from Pexels and are used under the Pexels licence
(https://www.pexels.com/license/), which is free for commercial and personal
use, requires no attribution and allows modification and redistribution. That is
the split LICENSE section 2 states in full: MIT for the code, Pexels for the
photographs, and both permissive.

You may keep these photographs in the site you publish with Reef, or replace
them with your own. Both are inside the licence. The one thing the Pexels licence
forbids has nothing to do with using a theme: reselling an unaltered photo as a
stock image, a print or a poster.

They are not versioned as blobs. scripts/covers.mjs is a plain manifest of
images.pexels.com URLs, and `pnpm build` fetches them into src/assets/ before
Astro compiles. The script also refuses any source narrower than the slot needs
(1920 px for the hero, 1200 px for a cover), so a blurry image fails the build
instead of reaching a reader.

PHOTOS.md, at the root of this repository, lists every file with the Pexels page
it came from, so each image can be checked one by one. The home page also plays
one video, Pexels video 4863640, under the same licence; it is streamed from the
Pexels CDN and PHOTOS.md credits it too.

To make the theme yours: change the URLs in scripts/covers.mjs, or drop the
`cover` field from a post and the layout falls back to a typographic card.
Nothing in the code depends on a specific image.

Everything else raster in the repository is generated, not sourced: the Open
Graph cards in public/og/ are produced locally by scripts/og.mjs from an
original SVG template that reads the theme's own color tokens, and the favicon
is an original inline SVG data URI built in src/layouts/BaseHead.astro.

## Demo copy

All demo copy (the fictional publication "Reef Notes", its posts, authors and
topics, and the legal boilerplate) was written for this theme, in English and
in French. No real company or person is named as an endorsement, and no logo
or brand asset of a third party is included. Replace all of it with your own
writing in production.

## Runtime npm dependencies

Installed from npm, bundled or used at build time, all under permissive
licenses. Versions are the ones resolved in pnpm-lock.yaml at the date above.

| Package | License | Why it is here |
|---|---|---|
| astro | MIT | The framework |
| @astrojs/mdx | MIT | Markdown and MDX posts |
| @astrojs/sitemap | MIT | sitemap-index.xml at build |
| tailwindcss + @tailwindcss/vite | MIT | Styling, CSS-first tokens |
| tailwind-variants | MIT | Component variant configs (tv) |
| tailwind-merge | MIT | Class merging inside tv |
| @fontsource-variable/space-grotesk | OFL-1.1 | Space Grotesk files |
| @fontsource-variable/instrument-sans | OFL-1.1 | Instrument Sans files |

There is no React, no animation library and no WebGL dependency in Reef. The
whole theme is .astro, and every effect on the page is CSS.

## Development-only dependencies

Never shipped to the browser.

| Package | License | Why it is here |
|---|---|---|
| typescript | Apache-2.0 | Type checking |
| @astrojs/check | MIT | astro check |
| sharp | Apache-2.0 | Rasterizes the OG SVG template in scripts/og.mjs |

## What is deliberately absent

- No analytics, tracking or consent scripts.
- No icon or illustration library.
- No CSS framework beyond Tailwind itself, no preset theme.
- No SEO package: src/layouts/BaseHead.astro and src/js/schema.ts are written
  by hand and belong to the theme.
- No font CDN, no Google Fonts requests at runtime.

## How to re-verify

From the repository root:

```bash
# every raster or vector asset actually present
find public src -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.webp" -o -iname "*.svg" -o -iname "*.gif" -o -iname "*.avif" \)

# license declared by each font package
node -e "console.log(require('@fontsource-variable/space-grotesk/package.json').license)"
```
