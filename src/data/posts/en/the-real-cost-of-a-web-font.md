---
title: "The real cost of a web font"
description: "A variable font is not automatically cheaper than two static weights, subsetting saves less than people think, and the expensive part is usually the fallback nobody designed. What a typeface actually costs, measured in bytes, requests and reflow."
pubDate: 2025-11-25
author: en/tomas-abaroa
topic: en/typography
tags: ["typography", "fonts", "performance"]
featured: false
draft: false
---

A client asked last month whether we could add a second typeface to their site. The licence was already paid, so as far as they were concerned the answer was free. It is a fair assumption and it is wrong, and explaining why turned into the note I wish someone had handed me years ago.

A web font is billed in four currencies: bytes, requests, one reflow, and a design decision you will make whether or not you notice.

## Bytes, measured properly

Start with the format table, because half of the confusion lives here.

| What you serve | One Latin text weight | Worth knowing |
| --- | --- | --- |
| WOFF2 | 18 to 26 KB | Brotli compressed, supported everywhere that matters |
| WOFF | 28 to 40 KB | Only for browsers older than your CMS |
| TTF or OTF | 90 to 160 KB | The file the foundry sent you. Never ship it |
| Variable, one axis, Latin subset | 35 to 60 KB | The interesting case, below |

Those are ranges from our own builds, not marketing figures. A serif with a large character set lands at the top of each range, a geometric sans with tight kerning tables at the bottom.

The number that matters is not any single row. It is the total, because fonts are render blocking in the sense that counts: text either waits for them or gets swapped, and both cost something.

## Variable is not automatically cheaper

This is the assumption I hear most often and it deserves a straight answer. A variable font packs every weight between its extremes into one file, plus the interpolation data to move between them. That file is bigger than one static weight and smaller than five.

The crossover is around three:

- **Two weights** (regular, bold): two static files win, usually by 15 to 20 KB.
- **Three weights**: roughly a tie. Pick based on whether you want optical flexibility later.
- **Four or more**, or any use of a weight that is not on the design's list: variable wins, and it keeps winning as the design grows.

There is a second argument for variable that has nothing to do with size. With a weight axis you can set `font-weight: 560` on a heading and stop pretending your design only ever wanted semibold. With optical size (`opsz`), the face adjusts its own contrast and spacing between 14 px body text and a 72 px title, which is the thing metal type did automatically and digital type spent thirty years forgetting.

## Subsetting removes less than you hope

Subsetting means shipping only the glyphs you need. The tooling is `fonttools`, and the command is unglamorous:

```bash
pyftsubset SourceSerif4-Variable.ttf \
  --output-file=source-serif-latin.woff2 \
  --flavor=woff2 \
  --layout-features="kern,liga,onum,tnum,frac" \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+2122"
```

Two warnings from experience. First, the savings are smaller than the marketing suggests for a Latin only face, because a Latin subset is most of the file already; the dramatic numbers you see quoted come from cutting Cyrillic and Greek out of a pan European font. Second, be careful with `--layout-features`. Drop `kern` and your headings fall apart. Drop `liga` and some faces lose the `fi` you were counting on. And if the site is multilingual, remember that French needs guillemets and the œ ligature, which are outside the plain ASCII range and quietly disappear if you subset by memory instead of by content.

The correct move is to declare the subset in CSS as well, so the browser can skip a download it does not need on a given page:

```css
@font-face {
  font-family: "Source Serif Var";
  src: url("/fonts/source-serif-latin.woff2") format("woff2");
  font-weight: 200 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+2122;
}
```

## The fallback nobody designed

Here is the expensive part, and it costs no bytes at all.

<dl>
  <dt>FOIT, flash of invisible text</dt>
  <dd>The browser hides the text while the font loads. Nothing is readable, the layout is stable, and the reader stares at an empty column. This is what font-display: block gives you.</dd>

  <dt>FOUT, flash of unstyled text</dt>
  <dd>The fallback renders immediately, then the web font replaces it. Readable at once, but the page moves when the swap happens. This is font-display: swap.</dd>

  <dt>Layout shift on swap</dt>
  <dd>The measurable cost of FOUT: the fallback and the web font have different metrics, so lines rewrap and everything below jumps. It lands in Cumulative Layout Shift and it is entirely avoidable.</dd>
</dl>

Avoidable, because CSS can force a system font to imitate the metrics of the one still downloading:

```css
@font-face {
  font-family: "Source Serif fallback";
  src: local("Georgia"), local("Times New Roman");
  size-adjust: 96.4%;
  ascent-override: 98%;
  descent-override: 24%;
  line-gap-override: 0%;
}

:root {
  --font-body: "Source Serif Var", "Source Serif fallback", Georgia, serif;
}
```

The four numbers are per pair of fonts and you do not compute them by hand. Tools like [Fallback Font Generator](https://screenspan.net/fallback) or the `fontaine` plugin measure both faces and print the declaration. Get them right and the swap becomes almost invisible: same line breaks, same page height, one change of shape.

If you would rather not fight at all, `font-display: optional` tells the browser to use the web font only if it is already cached or arrives within about 100 ms, and otherwise to keep the fallback for the whole visit. Zero shift, guaranteed, at the price of some first time visitors never seeing your typeface. For a text heavy site with returning readers, that trade is better than it sounds.

## Requests, and the one preload rule

Preload exactly the fonts used above the fold, which for a text site means one, maybe two:

```html
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/source-serif-latin.woff2" crossorigin>
```

The `crossorigin` attribute is mandatory even for a same origin file, because fonts are fetched in CORS mode; without it the browser downloads the file twice and you have made things worse while feeling clever. Preloading five fonts is the same mistake at scale: everything is high priority, so nothing is.

Self host. A third party font host means a DNS lookup, a TLS handshake and a second cache, and browsers have partitioned their HTTP cache since 2020, so the old shared cache argument for public CDNs is simply no longer true. [Fontsource](https://fontsource.org) packages the open families as npm modules with the subsets already cut.

## So what does a second typeface cost?

For that client, honestly: about 45 KB, one extra preload we could not afford, a fallback pair to calibrate, and the risk of a swap on the page that matters most to them. We shipped it anyway, and paid for it by dropping a weight they were not using. That is the whole discipline. Nothing is free, everything is worth it if you know the price, and the only unacceptable answer is not knowing.
