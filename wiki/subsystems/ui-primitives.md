<!-- wiki/subsystems/ui-primitives.md - the primitive library: folder anatomy, the Button canon, shared infrastructure, script policy. -->
---
title: UI primitives
summary: The 36 primitive families of src/components/ui, their folder contract, the canonical Button, and the shared dialog and overlay infrastructure.
sources:
  - src/components/ui/README.md
  - src/components/ui/button/Button.astro
  - src/components/ui/dialog/Dialog.astro
  - src/components/ui/_dialog.ts
  - src/components/ui/_overlay.css
  - src/components/ui/accordion/AccordionItem.astro
updated: 2026-08-15
---

# UI primitives

36 families, all under src/components/ui. The written contract is src/components/ui/README.md;
this page maps how it plays out in the code.

## Folder anatomy

`ui/<name>/<Name>.astro` plus `index.ts` re-exporting the component and its
tv() config. Composites (card, dialog, dropdown, table, tabs) have one file
per part and a single barrel. Two shared files sit at
the root of ui/ and are not primitives: _dialog.ts (the modal controller)
and _overlay.css (scrim and overlay animations).

## The canon: Button (src/components/ui/button/Button.astro)

Read it before writing any primitive. It demonstrates every convention:

- Exported tv() config (Button.astro:9) with base classes including
  `rounded-pill` (:11), seven variants (hero, primary, dark, outline,
  glass, ghost, link; :17-29), five sizes (:31-37), defaults (:39).
- `VariantProps<typeof button>` merged into platform props typed as a union
  of `HTMLAttributes<"button">` and `HTMLAttributes<"a">` (:44-47).
- Tag polymorphism: `const Tag = href ? "a" : "button"` (:50).
- Caller classes merged through the config, `data-slot="button"` on the
  root (:53-57).

Other components reuse the exported config instead of copying classes; that
is the point of exporting it.

## Platform first, verified

The library leans on native behavior before scripts:

- Dialog and Sheet are native `<dialog>` elements
  (src/components/ui/dialog/Dialog.astro:45-52): showModal gives focus
  trap, Escape and inert for free. The aria convention is
  `${id}-title` / `${id}-description` (Dialog.astro:2-6).
- Accordion is a native `<details>/<summary>` group; exclusive opening uses
  the platform `name` attribute, zero JavaScript
  (src/components/ui/accordion/AccordionItem.astro:2-4).
- Marquee loops in pure CSS with a duplicated aria-hidden clone, paused on
  hover and focus (src/components/ui/marquee/Marquee.astro:2-5).

10 of the 63 files carry a `<script>`: dialog, dropdown, field,
locale-switcher, reveal, sheet, stagger-reveal, tabs, and the two theme-toggle
files. Each one names, in its header, the platform gap it fills.

## Shared modal infrastructure

- src/components/ui/_dialog.ts binds one delegated listener set on the
  document (idempotent via a `bound` flag, :8; called by both Dialog and
  Sheet, :61-66). Triggers are `[data-dialog-trigger="id"]` (:28-33),
  closers `[data-dialog-close]` (:35-40). Scrim clicks are detected by
  coordinates against the dialog box, and only when the press started on
  the scrim (:10-12, :45-58), so text selection cannot close the modal.
- src/components/ui/_overlay.css styles the shared ::backdrop (the scrim,
  blur) and animates open and close with `allow-discrete` transitions and
  `@starting-style`, degrading to instant on older engines.

## Notable singles

- theme-toggle: ThemeInit (inline, pre-paint, view-transition safe) and the
  ThemeToggle button; see [tokens](tokens.md) for the wiring.
- reveal and stagger-reveal: the viewport entrance wrappers; see
  [motion](motion.md) for their never-hidden-without-JS guarantee.
- icon set: not under ui/ but part of the same discipline;
  src/components/svg/icons holds 60 original 24x24 stroke icons, the name
  union derived from data (icons.ts).

## Notable primitives

A few primitives exist because the market does not ship them; each is the part
a buyer of another theme would write by hand.

### empty-state

The three moments a product looks broken while working fine: no rows, no
results, nothing yet. The artwork is generated SVG built from the theme's own
wave motif, so it retints with the palette and costs no request. Three tones:
neutral, search (the accent) and error (coral, never a pure red that would
shout louder than needed).

The action slot uses `empty:hidden`, so a state with nothing to do does not
leave a white gap. If there is genuinely nothing to do, do not show a state.

### field

The accessibility wiring nobody writes by hand: the label points at the
control, hint and error are announced through `aria-describedby` in that order
(error first, because it is what blocks the submit), the error sets
`aria-invalid` and lives in a live region so it is heard the moment it appears.

The wiring happens at runtime rather than at authoring time, so the slot can
hold an Input, a Textarea or a Select without the caller repeating `id`,
`aria-describedby` and `aria-invalid` on every field, and without being able to
forget them.

## Routes never live in a component

`siteRoutes` in `src/config/navData.json.ts` holds every target that changes
from one site to the next: blog, topics, authors, about, contact, legal.
Navbar, Footer and the reading pages all read from it.

This is deliberate and it is the fix to the most common complaint about bought
themes: a navbar with a hard-coded path forces the buyer to open component
internals to rebrand. One file redirects the whole theme.

The same rule applies to the brand name: the chrome reads `siteData.name`, it
does not spell out the demo publication.

## Adding a primitive, in order

Read ui/README.md, imitate Button, use only floor-3 tokens, try the
platform before writing a script, put `data-slot` on every part root, keep
44px touch targets, export the tv config through index.ts, stay under 400
lines, one-line header, then run the review checklist at the end of docs/design.md on it.
