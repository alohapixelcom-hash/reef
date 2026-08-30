<!-- docs/design.md - the Aloha Pixel design doctrine: what this house will and will not ship, and why. -->

# The Aloha Pixel design doctrine

This is the house standard for every theme Aloha Pixel builds. It is not a style
guide in the usual sense - it does not tell you which blue to use. It tells you
which decisions have already been made, which shapes are refused, and what has
to be true before a page ships.

Read it before you add a section. Read it again before you add an effect.

## Why this file exists

Generated interfaces have a look. Not a bad look exactly, but a recognisable
one, and once a reader recognises it they stop reading the page and start
reading the tool that made it. That is the failure this file exists to prevent.

The tells are not mysterious. They are a small set of shapes that appear when
nobody made a decision: a purple gradient behind centred text, three equal
cards in a row, a headline filled with a gradient, one font doing every job, a
pill badge announcing a version nobody asked about, a row of round numbers.
Each one is what you get when a layout is assembled instead of designed.

So the doctrine is mostly a list of refusals, and for each refusal, the thing
we do instead. A refusal without a replacement is just a gap, and gaps get
filled with defaults.

## The one test

Before anything ships, one question: **would a reader be able to name the
studio that made this from the page alone?**

If the answer is no, the page is not finished. Not wrong - unfinished. It means
nothing on it is ours yet.

Everything below is in service of that question.

---

## 1. Type

**The pairing is the design.** Every theme has exactly two families: a display
face that carries the character, and Instrument Sans for everything a reader
actually reads. The display face is what makes each theme itself.

| Theme | Display | Body |
|---|---|---|
| Reef | Space Grotesk | Instrument Sans |
| Kai | Archivo | Instrument Sans |
| Koa | Syne | Instrument Sans |
| Swell | Bricolage Grotesque | Instrument Sans |

Two families. Never three, never one. A page set entirely in its body face is a
document, not a design; a page with four families is a ransom note.

**What is refused.** Inter, Roboto, Open Sans, Poppins, Montserrat, Lato,
Nunito, and `system-ui` as a display face. Not because they are bad faces -
Inter is an excellent face - but because they are the ones every tool reaches
for first, and a reader who has seen forty generated pages this month has seen
all forty in Inter.

**The accent word.** Every big title carries exactly one word in the accent
role. That word keeps the display face and its weight. It does not become an
italic serif.

The italic-serif accent word is the most common ornament on the web right now,
it appears in every generated landing page, and it says nothing. Ours says
something: the accent word is underlined by a hand-drawn wave, because the
Aloha Pixel logo is a wave. The mark and the typography say the same thing.
That is what a signature is.

One accent word per title. Two is a decoration. The rule lives in
`.accent-script` in `src/styles/global.css`, defined once, and the wave itself
in `--accent-wave` in `tokens.css`, one per colour mode.

**Scale.** Five display steps, tuned with `clamp()` so they hold from 320 px to
1440 px. Line height tightens as size grows: 1.6 for prose, under 1.1 for the
largest display. Negative letter-spacing on the big steps only - a tracked-out
body face reads as a slide, not a page.

**Measure.** Prose lives between 45 and 75 characters. `.measure-prose` and
`.measure-wide` exist so nobody has to guess. A full-width paragraph on a
1440 px screen is unreadable no matter how good the face is.

---

## 2. Colour

**One anchor hue per theme, one accent, and neutrals tinted toward the anchor.**

| Theme | Anchor | Accent |
|---|---|---|
| Reef | turquoise `#1a9fc4` | coral `#f95c36` |
| Kai | abyss blue `#336c93` | coral |
| Koa | fern `#5c7350` | coral |
| Swell | violet `#8b4dff` | coral |

The anchor hue is the action colour. It is what `--color-primary` resolves to
in every theme, so it is what buttons, links and focus rings are made of: the
colour a reader learns to associate with "this responds".

Coral is the second voice, mapped to `--color-accent`, and it is the one thing
all four themes share. It is the only warm note in an otherwise cold house, and
it is rationed: an eyebrow, a marker, the wave under an accent word. It never
becomes the dominant colour of a page, because an accent that dominates is not
an accent, it is a second background.

**What is refused.**

- Background gradients on heroes. Especially purple to blue, and especially
  behind centred text. If a hero needs depth it gets a photograph, not a mesh.
- Gradient-filled headlines (`background-clip: text`). Solid ink, always. A
  headline that needs a gradient to be interesting has the wrong words in it.
- Pure `#000` and pure `#fff`. Every neutral in every theme is tinted toward
  its anchor. `#0a0f17` is not black, it is the darkest turquoise we allow.
- The thick coloured stripe down one edge of a card.

**Light is the default.** All six sites open light and offer dark. Dark-first
was the earlier house position and it was wrong for a simple reason: a theme is
judged in the two seconds before anyone touches a toggle, and dark-by-default
made every theme in the family look like the same dark theme.

Both modes are composed, neither is an inversion. In dark mode, shadows become
luminous borders and inner glows, because a drop shadow on a dark surface is
invisible and the depth has to come from somewhere.

**The token contract.** Three floors: the raw palette, semantic aliases, and
the utilities that markup is allowed to touch. Markup writes `bg-background`,
`text-foreground`, `border-border`. It never writes `bg-ink-900`. This is not
tidiness - `pnpm rebrand` repaints a whole theme by editing the first floor
only, and one leaked palette class in a component breaks that promise for the
buyer. `docs/conventions/tailwind.md` holds the full contract and the grep that
enforces it.

---

## 3. Layout

**Asymmetry by default.** A page that centres everything has made one decision
and repeated it. Text sits left. Sections lead from the left. The eye gets a
single starting line to come back to on every scroll.

Centre something when centring is the point - a closing call to action, a
single quotation - and then it reads as deliberate because it is the exception.

**What is refused.**

- Three equal cards in a row. This is the most reliable tell there is. Two
  columns of unequal weight, a zigzag, an asymmetric bento, a plain list with
  rules between the items - all of these say more and cost less.
- Cards inside cards. One containment layer. If a bordered box contains
  bordered boxes, remove the outer one.
- The full-viewport centred hero with one sentence and one button. A hero
  fills the first screen, frame included: `min-h-[calc(100svh-1rem)]`, then
  `sm:calc(100svh-1.5rem)` and `md:calc(100svh-2rem)`, one value per step
  because the frame around the panel is `p-2 / p-3 / p-4`. It is never a bare
  `80svh`: that leaves a pale band under the panel on arrival and the hero
  reads as short. And never a fixed pixel value, so it follows any screen.
  What fills it is what matters: the hero sits inside the page rather than
  replacing it, and it carries enough to decide with.

  Padding does NOT change that height. `box-sizing` is `border-box`, so
  padding is counted inside `min-height`: it pushes the content down inside a
  box that does not move. Only `min-height` changes the height.
- Uniform radii everywhere. Containers are soft, the things inside them are
  tight. When every corner has the same radius the page looks extruded.
- Pill badges announcing a version or a status above a title. The version
  number belongs in the changelog. Nobody buys a theme because it reached
  1.0.2.
- Rows of large round numbers. If a figure is real and it decides something,
  put it where the decision is made, in a sentence, and let it be odd. Round
  numbers in a grid read as invented whether or not they are.
- Fixed pixel container widths. `container-page` is the reference.

**Cards are not the only container.** A border plus a shadow plus a white fill
is one option among several: a tinted ground with no border, spacing alone, a
single hairline rule. Varying the containment across a page is most of what
makes it look composed.

---

## 4. Photography

**Photographs, never gradients - and the licence is part of the design.**
Every hero and every cover in this family is a photograph. Since 1.3.0 they
come from Pexels, chosen one by one and listed in `PHOTOS.md` with the page
each one came from.

This changed for a reason worth stating, because the earlier position was the
opposite and it was wrong. This file used to say "only Aloha Pixel
photographs, no stock, ever". The images it described were Adobe Express
assets, which a subscription licence forbids redistributing inside a resold
template. A theme that ships an image its buyer has no right to publish is not
a theme, it is a liability with a border radius. The Pexels licence allows
commercial use, modification, and redistribution inside a product like this
one; it forbids only reselling an unaltered photo as stock, which is not what
a theme does.

So the rule is not "our own photographs". The rule is: **a photograph whose
licence the buyer can verify, named in `THIRD-PARTY.md` and traceable in
`PHOTOS.md`.** A studio archive would satisfy it too. Nothing else does.

**Every hero carries one.** A gradient with two blurred halos is what a hero
looks like when there was no photograph available. There is always a
photograph available.

**How they are wired.** Images are not versioned as binaries. Each theme has a
build script holding a manifest of URLs, and `pnpm build` fetches them into
`src/assets` before Astro compiles. The script reads the WebP header and
refuses any source narrower than the slot needs - 1920 px for a full-bleed
hero, 1200 px for a card. A blurry image fails the build instead of reaching a
reader. Repositories stay light, and a buyer swaps the whole image set by
editing a list of URLs.

**The veil.** Text over a photograph needs a scrim, and the scrim has to hold on
the brightest frame of the image, not the average one. Ours is a horizontal
gradient: dense where the text sits, opening toward the far edge so the
photograph is still a photograph. Two numbers matter - it starts around 90 %
and it must not reach 0 % before the text column ends.

One trap, and it has bitten this codebase twice. Inside a dark scene the scrim
must read the theme's own background variable, never `var(--color-background)`.
The semantic alias is substituted on `:root`, which means it computes to the
*light* value, and that computed value inherits down into the dark subtree. The
scrim then paints white over the photograph. If a dark section is missing
`.on-dark` or `.dark`, force the value on the section itself rather than
reaching for a palette name in the markup.

---

## 5. Motion

**Motion is a ladder and you take the lowest rung that works.**

1. The CSS catalogue - `animate-*` utilities declared with `@utility` in
   `src/styles/motion/`, each carrying its own keyframes.
2. Viewport reveals - one shared IntersectionObserver, `Reveal` and
   `StaggerReveal`.
3. Scroll-driven CSS - `animation-timeline: view()`, no JavaScript.

There is no fourth rung. No theme in this house ships an animation library.
Anything the first three cannot express gets redesigned until they can, and
that constraint has never once cost us a page.

**Reduced motion is enforced three times**, and the repetition is not
redundancy. Globally in `global.css`, because it collapses every transition.
Again in `scroll.css`, because a `view()` timeline ignores `animation-duration`
and the global collapse cannot reach it. And a third time in JavaScript,
because a CSS rule cannot un-hide what a script already hid.

**Nothing is hidden without JavaScript.** Reveal wrappers hide their content
from inside their own script, immediately before observing it. With JavaScript
off, nothing was ever hidden. Any `opacity: 0` sitting in markup or in an
unguarded CSS rule is a bug waiting for a slow connection.

**A heavy effect pays a toll.** One exists in this family - the scroll-scrubbed
film sequence, where the reader's scroll drives a video playhead. It earned its
place by clearing every rung of this ladder:

- it never initialises under reduced motion, under Save-Data, or on a
  2g-class connection;
- it loads nothing until a real scroll gesture, proximity to the viewport, and
  an idle browser all hold at once;
- it pauses off-viewport and in hidden tabs;
- it re-installs on `astro:page-load` behind a `data-*-ready` guard and tears
  down on `astro:before-swap`, through a single AbortController;
- it degrades to a still frame that carries the whole message on its own.

Any future effect clears the same five before it lands. Most will not, which is
the point.

**Interactive states are not optional.** Hover, `active:scale-[0.97]`, and a
visible `focus-visible` ring on everything that responds. A page with no
pressed state feels like a picture of an interface.

---

## 6. Copy

Words are design. A beautiful page with assembled copy fails the one test as
surely as a purple gradient does.

**Banned outright:** elevate, seamless, unleash, unlock, empower, next-gen,
game-changing, effortless, revolutionary, "take your X to the next level", and
any sentence that would survive being moved to a different company's website.

**Write the concrete thing instead.** Not "streamline your workflow" but "eight
products, and that is the whole shop". Not "trusted by industry leaders" but
the number of projects taken in a year and why it is that number. Specificity
is the cheapest differentiator available and almost nobody spends it.

**Numbers are real or absent.** Counters in this family count something
countable - pages built, primitives, icons drawn. They are never rounded up to
look better, and there is never a fifth one added because four looked sparse.

**Demo content is labelled as demo content.** Reef Notes, Nalu, Vela and Onda
are inventions, their authors and clients and testimonials are inventions, and
every theme says so in its LICENSE and its README. A fictional testimonial
presented as real is not a design decision, it is a lie with a border radius.

---

## 7. The review

Before a page ships, walk it once looking only for these. Finding one is a
problem. Finding two in the same viewport means the page was assembled, not
designed.

- [ ] A gradient behind a hero, or filling a headline
- [ ] Three equal cards in a row
- [ ] A card inside a card
- [ ] One font doing display and body
- [ ] An italic serif accent word
- [ ] A pill badge above a title
- [ ] A row of round numbers
- [ ] Everything centred
- [ ] `#000` or `#fff` used literally
- [ ] A hero with no photograph
- [ ] A decorative element that cannot be clicked, read, or explained
- [ ] Copy that would survive a find-and-replace of the company name
- [ ] A palette class in markup
- [ ] Any interactive element with no focus ring
- [ ] Any claim on the page that the repository cannot prove

That last one has cost this house more than every visual tell combined. A
feature list is checked in thirty seconds. If the page says the theme ships a
library, the library is in `package.json`, or the sentence goes.

---

## Where this comes from

The refusals above were sharpened by reading work published by others on the
same problem: the named-tell catalogues in Nutlope's Hallmark, the taste and
redesign skills published at tasteskill.dev by Leonxlnx, VoltAgent's collection
of design documents from studios whose work holds up, and Apple's Human
Interface Guidelines as distilled by dickwu's apple-design-skill.

Nothing here is copied from any of them. What is written above is this
studio's own position, argued from its own files, and every rule points at a
real decision in a real theme. Those references are named because reading them
made this file better, and because a house that refuses assembled work should
not pretend it arrived at everything alone.

The disagreements are ours too. This house keeps a single accent word in a big
title where some of that work would remove it, because the wave beneath it is
the mark. It keeps light as the default where much of the field has settled on
dark. And it ships one heavy effect, once, where a stricter reading would ship
none.
