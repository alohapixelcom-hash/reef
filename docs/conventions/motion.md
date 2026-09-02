<!-- docs/conventions/motion.md - the motion doctrine: CSS catalog first, reveal wrappers second, scroll timelines third, reduced motion everywhere. -->

# Motion rules

## The ladder: cheapest tool that does the job

1. CSS catalog. 55 `animate-*` utilities in src/styles/motion/ (six
   families imported by motion/index.css:22-27) plus the three brand
   animations in tokens.css:145-147 (`animate-rise|marquee|pulse-slow`).
2. Viewport-triggered reveals: `Reveal` and `StaggerReveal`
   (src/components/ui/reveal, src/components/ui/stagger-reveal), one shared
   IntersectionObserver each.
3. Scroll-driven variants: the `animate-scroll-*` utilities in
   src/styles/motion/scroll.css, powered by `animation-timeline: view()`,
   zero JavaScript.
4. There is no fourth rung. Reef has no island and no animation library:
   anything the first three cannot express is redesigned until they can.

## Catalog conventions (src/styles/motion/index.css:6-19)

- Every utility is `animate-<name>`, declared with `@utility`, and embeds
  its own `@keyframes`.
- Entries and exits play once with fill `both`: an upstream
  `animation-delay` never flashes the final state, so cascades are just
  inline delays on children.
- Loops are slow and low amplitude; they decorate, they do not shout.
- Tuning happens at the element, never by editing the catalog:
  `[animation-duration:1.2s]` for tempo, the `--motion-travel`,
  `--motion-scale`, `--motion-float`, `--motion-parallax` knobs for
  amplitude, and the three shared easings (`--motion-ease-out|in|spring`,
  index.css:31-34).

## Nothing is hidden without JavaScript

`Reveal` and `StaggerReveal` only hide content from inside their script,
just before observing (Reveal.astro:29-31, StaggerReveal.astro:32-34). With
JavaScript off, nothing was ever hidden. Any new entrance effect must keep
this property: no `opacity-0` in markup that a script is supposed to remove.
Both wrappers re-init on `astro:page-load` and mark processed nodes with a
`data-*-ready` attribute; imitate that exact shape.

## Reduced motion is enforced three times, for three reasons

1. Globally: the `prefers-reduced-motion` block in
   src/styles/global.css:307-316 collapses every CSS animation and
   transition. Components do not need their own guard.
2. Locally in scroll.css:17-26: a `view()` timeline ignores
   `animation-duration`, so the global collapse cannot reach it. The double
   guard (`@supports` + `@media`) is not a duplicate; never remove it.
3. In JavaScript: the CSS guard cannot un-hide what a script has already
   hidden. The reveal observer scripts check
   `matchMedia("(prefers-reduced-motion: reduce)")` before hiding anything
   (Reveal.astro:49), and the shrinking navbar disables its own transitions in
   a local media query.

## Accessibility of moving things

- Marquees duplicate content for the seamless loop and pause on hover and
  keyboard focus (src/components/ui/marquee/Marquee.astro). The duplicate is
  `aria-hidden` AND `inert`: `aria-hidden` alone hides the clone from screen
  readers but leaves its links in the tab order, so a keyboard user tabs twice
  through the same list, the second time into links nothing announces. Any
  filler repetition the caller adds to widen the track needs the same treatment
  (src/components/Sections/Home/TopicMarquee.astro): five stops for five
  destinations, not fifteen.
- Scroll rails have no autoplay and no library: a `scroll-snap` rail with a
  `tabindex` and a name gets keyboard scrolling from the platform for free.

## No heavy effect without paying the toll

Reef ships no canvas and no WebGL. It ships exactly one video, and the
exception is instructive.

The home page carries a scroll-scrubbed sequence
(src/components/Sections/Home/FilmScene.astro, engine in `_film.ts`): the
video's playhead is tied to scroll position, so the reader's hand advances the
image. It is not a background video. It is a port of an effect already running
in production on alohapixel.app, kept because the scrubbed playhead is the whole
point of the section and no CSS rung expresses it; it supersedes the earlier
"no video" line here.

It earned its place by clearing the sobriety ladder in full, and any future
heavy effect must clear the same one before it lands:

- never initialize under reduced motion, and also not under Save-Data or a
  2g-class connection;
- load nothing until three conditions hold at once: a real scroll gesture, the
  section near the viewport, and the browser idle;
- pause off-viewport, via IntersectionObserver, and in hidden tabs, via
  `visibilitychange`;
- re-init on `astro:page-load` behind a `data-*-ready` guard, and tear down on
  `astro:before-swap`. This one is not optional and it is not theoretical: the
  first version of FilmScene skipped it, and the sequence was measurably dead
  after home -> post -> home, with the rAF loop and both observers from the
  previous page still running. Route every listener through a single
  AbortController so teardown is one line and none can be forgotten;
- degrade to a still frame that carries the whole message. If the fallback is
  not readable on its own, the effect has not earned the right to run.

Everything else on the page stays cheap, and nothing loops on its own: the
entrance reveals play once and stop, and the page is still after that.