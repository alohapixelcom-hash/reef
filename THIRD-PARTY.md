<!-- THIRD-PARTY.md - the honest inventory of everything in this theme that Aloha Pixel did not create. -->

# Third-party inventory

Everything in Reef that we did not create ourselves is listed here, with its
license and where it lives. If it is not on this page, it was made for this
theme. This inventory is what makes Reef safe to buy, ship and resell as part
of your end products.

Verified against the repository on 2026-08-14 (packages read from
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
extra font: it keeps the heading font and carries a coral wave underline
(--accent-wave, an original inline SVG covered by the theme LICENSE).

## Icons

None are third party. The 60 icons of the set are original path data drawn
for this theme on a 24x24 grid (src/components/svg/icons/icons.ts, rendered
by src/components/svg/icons/Icon.astro). No icon library is imported, copied
or traced. They are covered by the theme LICENSE.

## Images and photos

The theme ships eleven photographs: one full-bleed hero and ten article covers.
They are not stock. They are Aloha Pixel's own archive, and they are NOT part of
the MIT grant that covers the code - LICENSE section 2 states the split in full.

They are not versioned as blobs either. scripts/covers.mjs is a plain manifest of
URLs pointing at the Aloha Pixel media library, and `pnpm build` fetches them
into src/assets/ before Astro compiles. The script also refuses any source
narrower than the slot needs (1920 px for the hero, 1200 px for a cover), so a
blurry image fails the build instead of reaching a reader.

Subjects, in order of the manifest: a wave hollowing out (hero), Hanauma bay,
an island reef split at the waterline, lava reaching the ocean, a green turtle
over a reef, the Maui coast, the same wave again, palms against a sunrise, the
Na Pali cliffs, and an aerial of the Na Pali coast.

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

## Skills de design embarquees (.claude/skills/)

- hallmark - MIT - copyright 2026 Hallmark contributors - github.com/Nutlope/hallmark
- taste-skill et redesign-skill - MIT - copyright 2026 Leonxlnx - github.com/Leonxlnx/taste-skill
- design-md (10 fichiers de reference) - MIT - copyright 2026 VoltAgent - github.com/voltagent/awesome-design-md

Ces skills guident les assistants IA qui travaillent sur le theme. Elles ne
sont pas chargees au build et ne pesent rien dans le site produit.
