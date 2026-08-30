---
title: "A type scale you can defend"
description: "Ratios are easy to pick and mostly wrong. A scale earns its place when every step has a job on a real page: five sizes, a measure that holds at 320 and at 1440 pixels, and clamp() written so a designer can read it out loud."
pubDate: 2026-06-16
author: en/tomas-abaroa
topic: en/typography
tags: ["typography", "css", "scale"]
cover: ../../../assets/covers/reef-echelle-typo.webp
coverAlt: "Palm trees in silhouette against a tropical sunset, their crowns stacked in tiers up the orange sky"
featured: true
draft: false
---

Ask a designer where their type scale came from and you usually get a ratio: a major third, a perfect fourth, the golden ratio if the project has ambitions. Ask what the fourth step is *for* and the room goes quiet.

A ratio is a way of generating candidates. It is not a design decision, and it cannot be, because it does not know what is on your page. The scales that survive contact with real content are the ones where every step has a job, and where the person who chose them can say what breaks if you delete one.

## Five steps, five jobs

This is the scale for this journal. Five sizes, and one of them is used exactly once per page.

| Step | Job | Mobile | Desktop | Line height |
| --- | --- | --- | --- | --- |
| Display | The article title, once | 32 px | 56 px | 1.05 |
| Section | h2, the reader's map | 24 px | 30 px | 1.2 |
| Sub | h3 and h4, rare | 20 px | 22 px | 1.3 |
| Body | Everything you actually read | 18 px | 19 px | 1.6 |
| Meta | Dates, captions, footnotes | 15 px | 15 px | 1.5 |

Two things in that table are worth arguing about, so let me argue for them.

Body text starts at 18 px, not 16. The 16 px default is a browser convention from an era of 96 dpi desktop monitors, and on a phone held at arm's length it is small. Every time we have raised body size on a client site, time on page went up and nobody wrote in to complain that the text was too large.

Meta text does not shrink further on mobile. Small text is where accessibility quietly fails, and 15 px is our floor. If something needs to be smaller than the floor to fit, the layout is wrong, not the type.

## The ratio is a starting point you are allowed to break

A 1.25 ratio from an 18 px base gives 18, 22.5, 28, 35, 44. Neat, and useless at the top: 44 px is not a title, it is a large heading, and the page has no moment of arrival. So we break the ratio at the display step and jump to 56, because that step has a different job from the rest of the scale. It is not "one size up from a section heading", it is the thing that tells you the article has begun.

Down at the small end we round to whole pixels rather than carrying the ratio's decimals. Sub pixel type sizes are a real thing browsers can render, and they are also a way of pretending that 22.4 px and 22 px are different design decisions. They are not.

- Steps that scale by ratio: body, sub, section.
- Steps that are set by hand: display (it is a poster) and meta (it is a floor).
- Steps we deleted: two of them, because nothing on any template used them, and a scale nobody uses is a scale that produces inconsistency the first time someone needs a size that is not there.

## Fluid, without the magic

Between the two columns of that table sits `clamp()`, and it is worth writing so a human can read it.

```css
:root {
  /* 32px at 320px viewport, 56px at 1240px, linear between. */
  --step-display: clamp(2rem, 1.478rem + 2.609vw, 3.5rem);
  --step-section: clamp(1.5rem, 1.37rem + 0.652vw, 1.875rem);
  --step-body:    clamp(1.125rem, 1.103rem + 0.109vw, 1.1875rem);
}
```

The middle value is not a magic number, it is a line through two points. The slope is the size difference divided by the viewport difference, and the intercept is what is left when you subtract the slope's contribution at the small end:

```
slope     = (56 - 32) / (1240 - 320) = 0.02609  ->  2.609vw
intercept = 32 - (0.02609 x 320)     = 23.65px  ->  1.478rem
```

### Two rules that keep it honest

Write the intercept in `rem`, never in `px`, so the whole expression still responds when a reader raises their browser's default font size; a clamp built only from `px` and `vw` ignores that preference and quietly fails [WCAG 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). And never let the fluid range be the whole design: below 320 and above 1240, the value locks, which is exactly what you want on a 1900 px monitor where a title that keeps growing becomes a billboard. If you would rather not do the arithmetic, [Utopia](https://utopia.fyi) generates the same expressions from the same four inputs.

## The three words the arguments are actually about

<dl>
  <dt>Measure</dt>
  <dd>The length of a line of text, counted in characters. 60 to 75 is the comfortable range for continuous prose; below 45 the eye jumps too often, above 85 it loses the start of the next line. Set it in ch and it follows the font.</dd>

  <dt>Leading</dt>
  <dd>The space between lines, set as unitless line-height so it multiplies the element's own size. It should grow as the measure grows and shrink as the type gets bigger: 1.6 for body text, 1.05 for a display title.</dd>

  <dt>Tracking</dt>
  <dd>Uniform letter spacing. Large type nearly always needs a little negative tracking, small type and uppercase need a little positive. It is the adjustment people reach for first and need least.</dd>
</dl>

In CSS that is four declarations, and they do more for readability than any font choice:

```css
.prose {
  max-inline-size: 68ch;
  font-size: var(--step-body);
  line-height: 1.6;
  text-wrap: pretty;
}

.prose h1 {
  font-size: var(--step-display);
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
```

`text-wrap: balance` evens out the lines of a short heading so you never get five words and then one. `text-wrap: pretty` does the humbler job on body copy, preventing the single word orphan at the end of a paragraph. Both are hints rather than guarantees, and both cost nothing when unsupported.

## Testing it on the two widths that matter

A scale that only looks right in the design file is not a scale. Ours gets checked on exactly two viewports, both with real content: 320 px, because that is still the narrowest phone in the field data, and 1440 px, because that is where a long title has room to embarrass you.

The tests are boring on purpose:

1. Does the longest real article title fit in three lines at 320 px without breaking a word?
2. At 1440 px, is the measure still under 75 characters, or did the container quietly grow?
3. Does the page still make sense at 200% browser zoom, which is the same test as asking whether any size is locked in px?
4. Do two adjacent steps look different enough that a reader can tell a section from a subsection without counting pixels?

### The question that kills scales

Question four is the one that does it. If you cannot tell the difference, you do not have two steps, you have one step and a rounding error, and the fix is to delete one rather than to add contrast somewhere else. The [cost of a second typeface](/blog/the-real-cost-of-a-web-font/) is a separate discussion, but a scale that needs one to be legible was never a scale in the first place.
