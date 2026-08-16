<!-- wiki/subsystems/fluidity.md - the gesture layer: springs, momentum, materials and the preferences that switch them off. -->
---
title: Fluidity
summary: Why the drawer can be grabbed mid-flight, why the press feedback beats the click, and which system preferences silently reshape the whole material layer.
sources:
  - src/js/spring.ts
  - src/js/haptics.ts
  - src/components/ui/sheet/sheet-gesture.ts
  - src/components/ui/sheet/Sheet.astro
  - src/components/ui/_overlay.css
  - src/styles/motion/materials.css
  - src/components/ui/button/Button.astro
  - src/styles/tokens.css
updated: 2026-08-15
---

# Fluidity

Most themes animate. This one is built so the moving parts can be **grabbed**.
The difference does not show in a feature list; it shows in the first three
seconds on a phone.

The through-line: motion starts from the value currently on screen, inherits
the user's velocity, projects where the gesture was heading, and can be
reversed at any instant.

## Why springs, not transitions

A CSS transition has a fixed duration and starts from a value decided in
advance. It cannot be caught in flight: grab a closing panel and the
transition has to finish, then start over. The jump is visible, and the
interface stops being a thing you manipulate.

A spring has no duration. It has a position, a velocity and a target. Changing
the target mid-flight keeps the current velocity, so the motion stays
continuous. src/js/spring.ts is 150 lines, zero dependency, and exposes two
parameters instead of three:

- `damping` 1.0 = no overshoot, clean arrival. Below 1 it bounces.
- `response` how quickly the value reaches its target, in seconds. **Not a
  duration**, a liveliness setting.

House rule: `damping: 1.0` everywhere by default. Bounce has to be earned by
the gesture: a panel you flicked may overshoot, a menu that just appeared may
not. Overshoot without momentum reads as a toy.

Integration runs at a fixed 1/240s substep rather than per-frame. A spring
integrated with a variable dt behaves differently on a struggling laptop and on
a 120 Hz screen; at a fixed substep it is identical everywhere.

## The drawer, in four details

src/components/ui/sheet/sheet-gesture.ts turns the mobile drawer into
something you push away rather than something you close with a button.

1. **Pixel tracking.** The panel sticks to the finger for the whole gesture,
   respecting where it was grabbed. A panel that jumps under the finger on the
   first move breaks the illusion immediately.
2. **Edge resistance.** Dragging the wrong way does not do nothing and does not
   stop dead: `rubberband()` makes the panel follow less and less. A hard stop
   reads as a fault; progressive resistance reads as "there is nothing more
   this way".
3. **Momentum projection.** On release we do not look at where the finger
   stopped but at where it was going: `project()` is the same exponential decay
   as inertial scrolling. A short flick dismisses; a long slow drag that stops
   halfway springs back. (The textbook `v²/2a` is *not* this and feels wrong.)
4. **Interruptibility.** A drag that starts while a spring is running reads the
   spring's presentation value and continues from there. No dead time, no
   animation to wait out.

Verified behaviour, from the instrumented run: mid-drag the transform is
`translate3d(150px, 0, 0)` for exactly 150px of finger travel, `data-dragging`
is set, and `--sheet-progress` sits at 0.58 so the scrim fades on the same
frames. Release with velocity closes; release without does not.

Three refusals are deliberate: nothing on a fine pointer (the gesture has no
meaning with a mouse, where the close button and Escape are faster), nothing
under reduced motion, and nothing while the content is being scrolled. The
hysteresis is 8px and the axis is decided once, then held.

## Response beats everything

The moment lag appears, directness falls off a cliff. The button presses on
`:active` with a 90ms transition in and the normal 200ms out (Button.astro):
sharp press, soft release. Feedback belongs to the pointer-down, not the click.

Haptics (src/js/haptics.ts) follow three rules: **causality** (fire on the
causing event, not after an animation), **harmony** (same frame as the visual,
or the two stop reading as one thing) and **utility** (commit, error, snap, and
nothing else). Capacitor's Haptics plugin is used when present, the Vibration
API otherwise, nothing on iOS Safari. Reduced motion switches haptics off too:
someone asking for calm is not only asking for visual calm.

## Materials

Glass is a functional layer, not decoration: it floats above the content, lets
you see what passes underneath, and so says "I am on top" without eating an
opaque strip. src/styles/motion/materials.css keeps three things true:

- **Weight carries hierarchy.** `.glass` is calibrated for small surfaces;
  `.glass-thick` adds blur and a deeper shadow because a large surface over
  dense content has to read thicker or it looks like a dirty rectangle.
- **Text on glass needs help.** `.vibrant` and the `.glass :where(p, li, …)`
  rule raise opacity and add half a weight step rather than lowering opacity.
  A flat 60% grey disappears the moment a light area passes underneath.
- **Materialize, do not fade.** `animate-materialize` raises blur and scale
  together, so the surface reads as a plate arriving rather than an image
  switching on.

Under the floating navbar there is no 1px divider: a hairline claims a
separation exactly where content passes underneath. The scroll edge effect
gradient-masks the content where the bar actually overlaps it, and only once
the bar is in its shrunk state.

Menus scale from their trigger, not their centre: `--overlay-origin` is set by
the `align` variant of DropdownMenu and MegaMenuPanel, so a right-aligned menu
unfolds from its right corner, where the button that was just pressed is.

## The preferences almost nobody ships

Three system settings reshape this layer. A sold theme that ignores them breaks
for a slice of its buyers' users.

- `prefers-reduced-motion` cuts every animation and the gesture layer with it
  (global.css, plus a local guard in scroll.css because a `view()` timeline
  ignores `animation-duration`).
- `prefers-reduced-transparency` drops every blur and makes surfaces solid.
  Hierarchy has to survive the material disappearing, so the fallbacks are
  written, not inherited.
- `prefers-contrast: more` gives every surface a 2px defined border, because
  once the shades close in it is the border and not the shadow that separates
  two planes.

## Typography

Tracking is size-specific, never one value for everything. The display scale
carries its own negative tracking (`--text-display-*` in tokens.css); the three
`--tracking-optique-*` tokens correct the extremes: small text opens up, large
text tightens, body copy stays at zero. Tailwind's `tracking-*` utilities still
win where an explicit choice was made, since the base rules only key on size.
