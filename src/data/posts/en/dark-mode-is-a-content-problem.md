---
title: "Dark mode is a content problem"
description: "Inverting a palette is an afternoon of work. The hard part is everything the palette does not control: photographs, screenshots, charts, embedded video, and the one brand colour that stops meaning anything once the background goes dark."
pubDate: 2026-02-17
author: en/tomas-abaroa
topic: en/design
tags: ["design", "dark mode", "css"]
featured: false
draft: false
---

Every dark mode estimate I have ever written was wrong in the same direction. The colours take an afternoon. The month goes to the things that are not colours: a client logo with a baked in white background, a chart library that hardcodes `#333`, a photograph of a product on seamless white that now punches a hole through the page, and a brand coral that looked confident on paper and looks radioactive at nine at night.

Dark mode is not a theme. It is a second edition of the content.

## The palette really is the easy part

Two CSS features have removed most of the plumbing.

First, tell the browser what you support, so that form controls, scrollbars, spellcheck underlines and the default canvas stop fighting you:

```css
:root {
  color-scheme: light dark;
}
```

Then let one declaration carry both values:

```css
:root {
  --surface: light-dark(oklch(99% 0.005 250), oklch(21% 0.02 250));
  --text: light-dark(oklch(28% 0.02 250), oklch(92% 0.01 250));
  --border: light-dark(oklch(90% 0.01 250), oklch(32% 0.02 250));
}
```

`light-dark()` picks a value based on the used colour scheme, and it only works if `color-scheme` is set, which is a nice piece of API design: the feature refuses to work until you have made the declaration that fixes the native widgets anyway.

The reason to write those in OKLCH rather than hex is that the first number is perceived lightness. Inverting a hex palette by flipping numbers produces colours that are mathematically opposite and visually wrong, because sRGB has no idea how bright a human thinks something looks. In OKLCH you can say "same hue, same chroma, lightness 21 instead of 99" and get a result that reads as the same colour in a different room.

One correction that surprises people: in dark mode, pure white text on pure black is worse, not better. It vibrates, it smears for readers with astigmatism, and it makes long articles tiring. Our defaults sit around 92% lightness on 21%, which is high contrast without the glare.

## What the palette does not control

Here is the list that actually consumes the budget.

- **Photographs on white.** A product shot on seamless white becomes a rectangle of daylight in the middle of a dark page. Either you get cutouts with transparency, or you accept a small compromise: `filter: brightness(0.92) contrast(1.02)` takes the edge off without visibly changing the product.
- **Screenshots.** A screenshot of a light interface is unfixable by filter, and inverting it is a lie. We either shoot the interface twice, or we place it on a light card that is intentionally light in both modes, framed so it reads as a quotation.
- **Charts and diagrams.** Anything with hardcoded stroke colours needs a real dark variant. SVG is the only sane format here, because it can inherit `currentColor` and stop being an image problem entirely.
- **Code samples.** Two themes, switched with the rest of the page. A light code block on a dark article is the first thing a developer notices and the last thing they forgive.
- **Embedded third parties.** Video players, maps, comment widgets and consent banners all have their own opinion. Some take a parameter. Some do not. Budget for the ones that do not.
- **The brand colour.** This one deserves its own section.

## The brand colour will need a sibling

A single accent value cannot serve both modes. Here is the coral from our own tokens, measured against the two surfaces:

| Colour | On light surface | On dark surface |
| --- | --- | --- |
| Coral 55 | 4.7:1, passes for body text | 2.1:1, fails everything |
| Coral 72 | 2.3:1, fails | 6.4:1, passes comfortably |

There is no single value in that column that works twice. The honest fix is two tokens with one semantic name: `--accent` resolves to Coral 55 in light and Coral 72 in dark, and the markup never knows which one it got. WCAG asks for 4.5:1 on body text and 3:1 on large text and on the visible parts of interface components, and a link colour that only passes in one mode is a colour that fails half your readers.

> If a token needs a `dark:` override in the markup, the token is wrong. Fix the layer that defines the colour, not the eleven places that use it.

## The flash, and the one script we allow

A theme that respects a stored preference has a genuine problem: the server does not know the preference, so the first paint can be wrong. The fix is a small blocking script in the head, and it is one of the few places where a blocking script is correct:

```astro
---
// src/components/ThemeInit.astro - runs before first paint, on purpose.
---

<script is:inline>
  const stored = localStorage.getItem("theme");
  const dark = stored
    ? stored === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
</script>
```

### Two traps in seven lines

Two details cost us a bug each. `is:inline` is required, otherwise the bundler moves the script and it no longer runs before paint. And if the site uses view transitions, the swap replaces the `<html>` element's attributes with the server rendered ones, so the class has to be re-applied on `astro:after-swap` or the page flashes back to light on the second navigation.

While you are in the head, ship the matching browser chrome:

```html
<meta name="theme-color" content="#fbfaf8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131a22" media="(prefers-color-scheme: dark)">
```

That is the address bar on mobile Safari and Chrome. Getting it wrong is the difference between a site that looks designed and one that looks like a document someone printed into a browser.

## What we tell clients now

Dark mode is quoted as a content deliverable, not a styling task, and the quote includes three lines they can act on: a set of images with transparent backgrounds, a decision about the brand colour in dark contexts, and a named person who will look at the ten most visited pages in both modes before launch.

That last one is not a joke. Every dark mode bug we have shipped was on a page nobody thought to look at twice: a legal page with an inherited table style, a 404 with a background image, an email template that is not even part of the site. The palette is a system, and systems are good at pages you designed. Content is not a system, and it will be waiting for you on the page you forgot.
