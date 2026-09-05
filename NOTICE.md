<!-- NOTICE.md - what the MIT license in LICENSE covers, and the three things shipped with the theme that carry terms of their own: the photographs, the demo content and the third-party material. -->

# Notices alongside the MIT license

Reef is free and open source under the MIT license. The full text is in
[LICENSE](LICENSE), which holds the MIT text and nothing else, so that GitHub
and every automated license scanner read it correctly.

This page carries what used to sit in that same file: what the MIT grant
covers, and the three things shipped with the theme that come with terms of
their own. The photographs come from Pexels and carry the Pexels licence, which
is at least as permissive. Nothing on this page restricts the MIT grant.

## 1. The photographs: Pexels licence

The MIT license covers the source code, the styles, the icons, the
documentation and the build scripts.

The ten photographs in `src/assets/` and `src/assets/covers/` come from Pexels
and are used under the [Pexels licence](https://www.pexels.com/license/).

That licence is free for commercial and personal use, requires no attribution,
and allows modification. You may keep these photographs in the site you publish
with Reef, or replace them with your own. Both are inside the licence.

The one restriction the Pexels licence carries has nothing to do with using
this theme: an unaltered photo may not be resold as a stock image, a print or a
poster.

[PHOTOS.md](PHOTOS.md) is the single place the provenance of each image is
checked: it lists every file with the Pexels page it came from, credits the one
video the home page plays under the same licence, and explains how the archive
ships the photographs while a build from the repository fetches them once
through `scripts/covers.mjs`. [THIRD-PARTY.md](THIRD-PARTY.md) records the same
split and the removal path: drop the `cover` field from a post and the layout
falls back to a typographic card. Nothing in the code depends on a specific
image, so deleting them is safe and supported.

## 2. Demo content

The demo copy, the fictional publication "Reef Notes", its fictional authors,
their fictional articles and every number quoted in them are demonstration
material. They are covered by the MIT grant, and they describe nobody.

Replace them in production. Do not present fictional testimonials, fictional
ratings or fictional people as real.

## 3. Third-party material

Reef embeds fonts and depends on npm packages that carry their own licenses.
The complete inventory, with the license of each item, is in
[THIRD-PARTY.md](THIRD-PARTY.md). Nothing in this file, and nothing in LICENSE,
overrides those licenses.
