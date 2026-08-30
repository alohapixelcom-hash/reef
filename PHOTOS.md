<!-- PHOTOS.md - where every photograph and the one video in this theme come
     from, and what you may do with them. One page, no ambiguity. -->

# Photo credits and licence

Every photograph and the video shipped with Reef come from **Pexels** and are
used under the [Pexels licence](https://www.pexels.com/license/).

What that licence gives you, as a user of this theme:

- Free for commercial and personal projects.
- No attribution required (this page exists because we prefer to be explicit).
- You may modify, crop, recolour and rebuild them.
- You may keep them in the site you publish with this theme, or replace them
  with your own. Both are fine.

The one thing the Pexels licence does not allow, and it has nothing to do with
using this theme: reselling an unaltered photograph as a stock photo, a print or
a poster. Do not do that, and you are inside the licence.

The archive of Reef already contains every one of these image files, in
`src/assets/`, at the exact crop the demo shows. Building from the archive needs
no network.

Building from the repository fetches them once: `scripts/covers.mjs` is a plain
list of Pexels URLs, run by `pnpm build` before Astro compiles. Earlier releases
pulled them from a media library we hosted; that is over, and no build of this
theme depends on a server of ours any more.

## The photographs

| File | Subject | Source |
|---|---|---|
| `src/assets/reef-hero-vague.webp` | Barrel wave, Hawaii | [Pexels #29275767](https://www.pexels.com/photo/29275767/) |
| `src/assets/covers/reef-budget-performance.webp` | Barrel wave, Hawaii | [Pexels #29275767](https://www.pexels.com/photo/29275767/) |
| `src/assets/covers/reef-html-qui-vieillit.webp` | Green mountain near the ocean | [Pexels #4321834](https://www.pexels.com/photo/4321834/) |
| `src/assets/covers/reef-echelle-typo.webp` | Palms against a tropical sunset | [Pexels #8985046](https://www.pexels.com/photo/8985046/) |
| `src/assets/covers/reef-mode-sombre.webp` | Lava, Hawaii Volcanoes National Park | [Pexels #35613489](https://www.pexels.com/photo/35613489/) |
| `src/assets/covers/reef-bon-brief.webp` | Coral reef in clear water | [Pexels #29290970](https://www.pexels.com/photo/29290970/) |
| `src/assets/covers/reef-collections-contrat.webp` | Sea turtle over a reef | [Pexels #20443161](https://www.pexels.com/photo/20443161/) |
| `src/assets/covers/reef-cout-police.webp` | Tropical beach, French Polynesia | [Pexels #12810721](https://www.pexels.com/photo/12810721/) |
| `src/assets/covers/reef-mesurer-lecteur.webp` | Sunset over the ocean | [Pexels #14281585](https://www.pexels.com/photo/14281585/) |
| `src/assets/covers/reef-prix-refonte.webp` | Cliff and cove seen from the air | [Pexels #8332588](https://www.pexels.com/photo/8332588/) |

## The video

The scroll-driven scene on the home page plays one clip, also from Pexels and
under the same licence.

| What | Subject | Source |
|---|---|---|
| Home page motion scene | A wave breaking, filmed from underwater at Electric Beach, Hawaii | [Pexels video #4863640](https://www.pexels.com/video/hawaii-electricbeach-4863640/) |

It is streamed from the Pexels CDN rather than shipped in the archive: the file
weighs 9 MB, which does not belong in a theme download, and Pexels serves it
with byte ranges, which the scene needs in order to seek. The five addresses
(three video, two posters) are the default props of the scene component, in one
block at the top of the file. Point them at your own video and nothing else
changes.

## Replacing them

Drop your own file in place, keep the same name and the same aspect ratio, and
nothing else has to change: the components import the asset by path and let
Astro generate the responsive sizes. Point the matching entry of `scripts/covers.mjs`
at your own URL, or delete the entry, and the build stops fetching ours.

## Everything else you see

No other raster image and no other video ship with this theme. Every icon and
every decorative shape is original SVG or CSS drawn for this house, covered by
the theme LICENSE. The Open Graph cards in `public/og/` are generated locally by
`scripts/og.mjs` from an original SVG template.
