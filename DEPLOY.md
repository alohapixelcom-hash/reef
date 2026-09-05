<!-- DEPLOY.md - how the live demo is published. Does not concern the theme itself. -->

# Deploying the demo

`reef.alohapixel.app` is the Cloudflare Worker **reef-demo**. Since
19 August 2026 it has been published automatically by **Workers Builds** on
every push to `main`. There is nothing left to run from a Mac.

| Setting | Value |
|---|---|
| Repository | `alohapixelcom-hash/reef` |
| Production branch | `main` |
| Build command | `pnpm run build` |
| Deploy command | `npx wrangler deploy` |

## Three things not to break

**`packageManager: pnpm@11.22.0` in package.json.** Otherwise the Cloudflare CI
starts on pnpm 10, which does not read the `allowBuilds` key of
`pnpm-workspace.yaml`: esbuild and sharp would be left with no native binary,
and the build would fail without saying why. Verified on 19 August on aloha,
where the exact error was `ERROR packages field missing or empty`.

**`run_worker_first = true` in wrangler.toml.** Without it, Cloudflare serves
`index.html` directly for `/` and the language redirect never runs. That is also
why the worker tests the extension of the path itself: it sees every request and
has to let stylesheets through.

**`wrangler.toml` and `src/worker.ts` belong to the demo.** They publish
`reef.alohapixel.app` and nothing else. The theme itself compiles to static HTML
and deploys to any host without them.

## The images

The photographs in `src/assets/` come from Pexels and are under the Pexels
licence. They are not versioned: `scripts/covers.mjs` fetches them before every
build, and the archive of the theme already contains them. The Pexels licence
allows redistribution, so nothing is taken away from anyone. `NOTICE.md`
section 1 and `PHOTOS.md` say which ones, and where from. Keeping them or
replacing them with your own comes to the same thing as far as the licence is
concerned.
