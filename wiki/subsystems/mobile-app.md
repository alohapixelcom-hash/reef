<!-- wiki/subsystems/mobile-app.md - shipping the theme as a native iOS and Android app with Capacitor. -->
---
title: Mobile app (Capacitor)
summary: How Reef builds into a real iOS and Android app, what the theme already does, and the exact commands from install to the stores.
sources:
  - capacitor.config.ts
  - scripts/app.mjs
  - src/layouts/BaseHead.astro
  - src/styles/global.css
---

# Mobile app (Capacitor)

Reef compiles to a folder of static files. [Capacitor](https://capacitorjs.com)
wraps that folder in a native shell, so the same code ships as a website and
as an app on the App Store and Google Play.

## What the theme provides, and what you do

| The theme provides | You do |
|---|---|
| `capacitor.config.ts`: app id and name, background colours, splash screen, HTTPS scheme on Android, no mixed content | Change `appId` and `appName` |
| `pnpm app`: the static build, then `scripts/app.mjs`, which removes the canonical and sitemap tags and makes the manifest start on the bundled home page | Install Capacitor and add the platforms, once |
| A layout ready for a phone: safe areas, `svh` heights, 44 px touch targets, no horizontal scroll, 16 px inputs | Icons and splash screen, signing, the store listings |

Capacitor is not a dependency of the theme: a site that never becomes an app
installs nothing more.

## The commands

```bash
pnpm add @capacitor/core @capacitor/ios @capacitor/android
pnpm add -D @capacitor/cli

pnpm app                  # dist/, tuned for a native shell
npx cap add ios           # once
npx cap add android       # once
npx cap sync              # after every pnpm app: copies dist/ into both projects
npx cap open ios          # Xcode
npx cap open android      # Android Studio
```

Once `@capacitor/cli` is installed, the type block at the top of
`capacitor.config.ts` can be replaced by
`import type { CapacitorConfig } from "@capacitor/cli";`.

`ios/` and `android/` are native projects: commit them to your own repository
if you edit them (icons, permissions, signing), or generate them again with
`npx cap add`.

## What the app contains

The app carries the **static build**: its posts are the Markdown files of `src/data/posts/`. The optional publication
engine needs a Worker and a database, so its back office does not apply to the
app. To show content managed in the back office, point the app at your site
with `server.url` in `capacitor.config.ts` for development only: Apple rejects
an app that only loads a remote website.

## Why it works without a rewrite

A Capacitor shell serves your files from a local origin (`capacitor://` on iOS,
`https://localhost` on Android), with no server.

| Constraint | What breaks in most themes | What Reef does |
|---|---|---|
| No server | Any SSR route, image endpoint or form action fails | `pnpm app` runs the static build, with no adapter; the contact form (`contact.astro`) ships with no `action` |
| Relative paths | Absolute links can resolve outside the bundle | `trailingSlash: "always"` and directory builds keep every internal link a real folder |
| The notch | Content slides under the status bar and the home indicator | `viewport-fit=cover` in `BaseHead.astro`, and `env(safe-area-inset-*)` on every fixed element |

## Signing and the stores

- **iOS**: in Xcode, target App, "Signing & Capabilities": your team and a
  bundle identifier equal to `appId`. Product, Archive, then Distribute App to
  App Store Connect. An Apple Developer account is required.
- **Android**: in Android Studio, Build, Generate Signed App Bundle, with your
  own upload key (keep it safe: it signs every update). Upload the `.aab` to
  the Google Play Console.
- **Icons and splash screen**: `npx @capacitor/assets generate` from one
  1024 px icon and one splash image.

## Before submitting

- [ ] `appId` and `appName` are yours; the icon and splash screen too.
- [ ] `pnpm app`, then `npx cap sync`, on the final content.
- [ ] Tested on a phone with a notch, in both orientations, with the largest
      system font size.
- [ ] External links open in the system browser (`target="_blank"`, or the
      `@capacitor/browser` plugin).
- [ ] `server.url` is commented out in `capacitor.config.ts`.
- [ ] The app offers something the website does not (offline reading, push
      notifications, a share sheet): Apple rejects apps that are "just a
      website". Each has a Capacitor plugin.

## What is deliberately not included

No native plugin is bundled: plugins belong to the app, not to the theme, and
each is one install away.

## Related pages

- [tokens.md](tokens.md) for the safe-area helpers
- [motion.md](motion.md) for `prefers-reduced-motion`, which matters more on a
  phone than on a desktop
