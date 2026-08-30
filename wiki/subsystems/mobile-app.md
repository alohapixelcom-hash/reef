<!-- wiki/subsystems/mobile-app.md - shipping the theme as a native iOS and Android app with Capacitor. -->
---
title: Mobile app (Capacitor)
summary: How Reef builds into a real iOS and Android app, what the theme already does for you, and the exact commands.
sources:
  - astro.config.mjs
  - src/layouts/BaseHead.astro
  - src/styles/global.css
  - scripts/app.mjs
updated: 2026-08-15
---

# Mobile app (Capacitor)

Reef compiles to a folder of static files. Capacitor takes that folder and
wraps it in a native shell, so the same codebase ships as a website **and** as
an app on the App Store and Google Play. No rewrite, no React Native, no
second design system.

This is not a checkbox. Everything below is already true in the theme, and
`pnpm app` produces a build that a native shell can load as is.

## Why it works without a rewrite

A Capacitor shell serves your files from a local origin (`capacitor://` on iOS,
`https://localhost` on Android) and there is no server. Three consequences, and
Reef is built for all three:

| Constraint | What breaks in most themes | What Reef does |
|---|---|---|
| No server | Any SSR route, image endpoint or form action 404s | The theme is 100 % static, no adapter, and the contact form (`contact.astro`) ships with no `action`, deliberately not wired |
| Relative paths | Absolute `/foo/` links can resolve outside the bundle | `trailingSlash: "always"` plus directory builds keep every internal link a real folder |
| The notch | Content slides under the status bar and the home indicator | `viewport-fit=cover` in `BaseHead.astro:78` and `env(safe-area-inset-*)` on every fixed element |

## The commands

```bash
pnpm app                    # build tuned for a native shell, into dist/
npx cap add ios             # once
npx cap add android         # once
npx cap sync                # after every pnpm app
npx cap open ios            # opens Xcode
npx cap open android        # opens Android Studio
```

`pnpm app` is `scripts/app.mjs`. It runs the normal build, then applies the two
changes a native shell needs and a website must not have:

1. **Strips the canonical and sitemap tags.** In an app they point at a website
   that the user is not on, and Apple's review has rejected apps for looking
   like a wrapped website because of exactly this kind of leftover.
2. **Rewrites the manifest start URL to a relative path**, so a cold start opens
   the bundled home page and not the public site.

Nothing else is touched: the HTML and the CSS are identical between the web
build and the app build. One codebase, one visual result.

## What the theme already guarantees

**Safe areas.** The floating navbar sits at
`max(1rem, env(safe-area-inset-top))` (`Navbar.astro`), so it clears the notch
and the Dynamic Island without a magic number. Any bottom bar does the same
with `safe-area-inset-bottom`.

**Viewport units.** The theme uses `svh` and never `vh`. On iOS Safari, `100vh`
is taller than the visible area while the URL bar is showing, which is the
single most common reason a hero looks cropped on an iPhone. `100svh` is the
small viewport, and it is always right.

**Touch targets.** Every interactive element is at least 44 px on its smallest
side, which is Apple's own minimum. The primitives enforce it with `min-h-11`
rather than leaving it to each page.

**No horizontal overflow.** Verified, not claimed: `scrollWidth` equals
`clientWidth` at 390x844 on every page of the theme. This is the check to run
before any release, because a single overflowing element makes the whole app
feel broken on a phone.

**No zoom on focus.** Every input is at least 16 px, which is the threshold
below which iOS zooms the page when a field takes focus and never zooms back.

## The checklist before submitting

- [ ] `pnpm app` then `npx cap sync`
- [ ] Set `appId` and `appName` in `capacitor.config.ts`
- [ ] Replace the icon and splash screen (`npx @capacitor/assets generate`)
- [ ] Test on a device with a notch, in both orientations
- [ ] Test with the system font size at its largest setting
- [ ] Check that every external link opens in the system browser, not in the
      shell: Capacitor's `Browser` plugin, or `target="_blank"`
- [ ] Turn off the WebView bounce if the content is not scrollable
- [ ] Apple rejects apps that are "just a website". Ship at least one thing the
      web version does not have: push notifications, offline reading, the
      camera, a share sheet. Capacitor has a plugin for each.

## What is deliberately not included

No native plugin is bundled. A theme that shipped push notifications and a
camera plugin would force every user to carry them, and would tie the theme to
plugin versions that move faster than a design system. The theme guarantees the
build is loadable and the layout is correct. The plugins are one `npm install`
away and belong to the app, not to the theme.

## Related pages

- [tokens.md](tokens.md) for the safe-area helpers
- [motion.md](motion.md) for `prefers-reduced-motion`, which matters more on a
  phone than on a desktop
