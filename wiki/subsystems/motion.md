<!-- wiki/subsystems/motion.md - the motion system: CSS catalog, reveal wrappers, the three reduced-motion layers. -->
---
title: Motion system
summary: A dependency-free CSS animation catalog, two viewport reveal wrappers, and the layered reduced-motion strategy that keeps it all optional.
sources:
  - src/styles/motion/index.css
  - src/styles/motion/scroll.css
  - src/styles/global.css
  - src/styles/tokens.css
  - src/components/ui/reveal/Reveal.astro
  - src/components/ui/stagger-reveal/StaggerReveal.astro
updated: 2026-08-15
---

# Motion system

Motion is CSS first, JavaScript last. The full doctrine is
docs/conventions/motion.md; this page maps the moving parts.

## The catalog (src/styles/motion/)

Six families imported by motion/index.css:22-27: fades, slides, zooms,
attention, materials, scroll. Together they declare 55 `animate-*` utilities
via Tailwind 4 `@utility`, each embedding its own keyframes. tokens.css adds
the three brand animations rise, marquee and pulse-slow (tokens.css:145-147,
keyframes :277-305). Conventions, written at motion/index.css:6-19:

- entries and exits play once with fill both, so cascades are inline
  animation-delay on children and nothing flashes its final state early;
- loops are slow and low amplitude;
- tuning happens at the element ([animation-duration:1.2s], the
  --motion-travel / --motion-scale / --motion-float / --motion-parallax
  knobs), never by editing the catalog;
- three shared easings at motion/index.css:31-34, the expo-out being the
  same curve as animate-rise.

The scroll family (motion/scroll.css) drives animations with
`animation-timeline: view()`: progression follows the element through the
viewport, no observer, no script.

## The reveal wrappers

Reveal (src/components/ui/reveal/Reveal.astro) and StaggerReveal
(src/components/ui/stagger-reveal/StaggerReveal.astro) trigger animate-rise
on viewport entry, one shared IntersectionObserver per wrapper type.

Their non-negotiable guarantee: content is only hidden by the script, right
before observation (Reveal.astro:26-32, StaggerReveal.astro:29-35). With
JavaScript off or reduced motion on, nothing was ever hidden and the page
renders complete. Both re-init on astro:page-load with a data-*-ready guard
(Reveal.astro:48-69), which makes them view-transition safe. StaggerReveal
observes the root and fans out incremental delays to its direct children
(StaggerReveal.astro:42-52; step prop, 90ms default).

## Reduced motion: three layers, three reasons

1. Global kill switch: src/styles/global.css:307-316 collapses every CSS
   animation, transition and smooth scroll under prefers-reduced-motion.
   Written once so no component depends on discipline.
2. Local guard in motion/scroll.css:17-26: a view() timeline ignores
   animation-duration, so the global collapse cannot neutralize it. Each
   scroll utility therefore nests @media (prefers-reduced-motion:
   no-preference) and @supports (animation-timeline: view()); without
   support, elements are simply visible.
3. JavaScript-driven motion: the CSS guard cannot see it. The reveal scripts
   check matchMedia before hiding anything (Reveal.astro:49-52), and the
   shrinking navbar disables its own transitions in a local media query.

## No heavy effect

There is no canvas and no WebGL, and nothing loops on its own. The heaviest
thing that moves is an entrance reveal, which plays once and stops. A set of
blurred radial-gradient halos used to drift in the hero; they were removed from
the whole family on 2 September 2026, because a blurred disc drifting behind a
title is the mark of a page assembled by a machine.