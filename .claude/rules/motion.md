<!-- .claude/rules/motion.md - the motion doctrine: CSS catalog first, reveal wrappers second, scroll timelines third, reduced motion everywhere. -->

# Motion rules

## The ladder: cheapest tool that does the job

1. CSS catalog. 55 `animate-*` utilities in src/styles/motion/ (six
   families imported by motion/index.css:22-27) plus the three brand
   animations in tokens.css:148-150 (`animate-rise|marquee|pulse-slow`).
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
  index.css:30-33).

## Nothing is hidden without JavaScript

`Reveal` and `StaggerReveal` only hide content from inside their script,
just before observing (Reveal.astro:27-31, StaggerReveal.astro:29-35). With
JavaScript off, nothing was ever hidden. Any new entrance effect must keep
this property: no `opacity-0` in markup that a script is supposed to remove.
Both wrappers re-init on `astro:page-load` and mark processed nodes with a
`data-*-ready` attribute; imitate that exact shape.

## Reduced motion is enforced three times, for three reasons

1. Globally: the `prefers-reduced-motion` block in
   src/styles/global.css:130-138 collapses every CSS animation and
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

- Marquees duplicate content for the seamless loop, hide the clone with
  `aria-hidden`, and pause on hover and keyboard focus
  (src/components/ui/marquee/Marquee.astro:2-5).
- Scroll rails have no autoplay and no library: a `scroll-snap` rail with a
  `tabindex` and a name gets keyboard scrolling from the platform for free.

## No heavy effect, and that is the point

Reef ships no canvas, no WebGL and no video. The most expensive thing on the
page is a set of blurred radial-gradient halos in the hero that drift slowly.
If a future effect needs a canvas, it must first prove that CSS cannot do it,
then clear a strict sobriety ladder: never initialize under reduced motion,
load only when visible, pause off-viewport and in hidden tabs, clean up on
`astro:before-swap`.
