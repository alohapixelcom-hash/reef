<!-- docs/backoffice.md - integration du socle editorial interne Aloha, preparation 2.3. -->
# Aloha editorial back office

## Validation scope

This integration is included in Reef 2.3. Real administrator sign-in and article
creation, modification and deletion have been verified on the private preview
branch. Category creation and ordering have also been verified against GitHub.
The standalone buyer authentication adapter has automated tests with SQLite and
simulated mail/Turnstile services. Distribution status is recorded in the release.

The interface reuses the Kai back-office shell selected for the Aloha common base. Its editorial engine
adapts the existing GitHub workflow to Reef's posts, authors and topics. It does
not provide store orders, payments, customer accounts or a second content database.

## Build and server configuration

The default build generates a read-only demonstration using public sample content. Setting
`ALOHA_BACKOFFICE=1` during `pnpm build` generates English and French screens and a
private build manifest. These files must be served through `src/worker.ts`, with
`run_worker_first = true`. Do not publish this enabled build on a static-only host.

The Worker supports two installations: the existing Aloha service bindings below,
or the standalone buyer setup below.

For an existing Aloha service, the Worker requires:

- `ALOHA_AUTH`: a service binding implementing the internal Aloha authentication API.
- `ALOHA_AUTH_ORIGIN`: the HTTPS origin expected by that authentication service.
- `ALOHA_ADMIN_EMAILS`: the comma-separated administrators of this specific site.
- `ALOHA_EDITORIAL_CONFIG`: server-side JSON with `id`, `depot`, `branche`,
  `dossierArticles`, `dossierAuteurs`, `dossierSujets`, `dossierImages`,
  `fichierImages: "scripts/covers.json"`, `format: "reef"`, and `langues: ["fr", "en"]`.
- Either `ALOHA_CONTENT`, a binding to your existing Aloha editorial service, or
  `GITHUB_CONTENT_TOKEN`, a secret restricted to the configured repository, with
  permission to read its contents and write the editorial branch.

No values in the browser can change the repository or grant an administrator role.
With `ALOHA_CONTENT`, the GitHub secret remains in the existing service. That service
must explicitly authorise the site, repository, branch and origin through its
`THEME_EDITORIAL_CONFIGS` configuration. It checks the signed session again.
Missing configuration closes both the administrative pages and APIs with 503.
An authenticated customer or an administrator absent from the site's list is refused.

The existing Aloha authentication service exposes only these routes through Reef:
`GET /api/auth/me`, `GET /api/config`, `POST /api/auth/request`,
`POST /api/auth/verify` and `POST /api/auth/logout`. Its Turnstile configuration
must accept the actual website hostname. The client needs a configured public key.
Email codes, limits and session signatures remain the responsibility of that service.

Service binding reference: [Cloudflare HTTP service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/).

## Editorial behaviour

- Search and sort articles by title, date or draft status; create, edit and delete.
- Create, rename, describe, order and delete categories. A category referenced by
  an article cannot be deleted. Git commits preserve history for recovery.
- Article and category writes use an atomic non-force branch update. A concurrent
  edit aborts with a conflict instead of overwriting the other person's work.
- Existing custom frontmatter is preserved. Required references are verified.
- A new article starts as a draft. Saving an existing article preserves its status
  unless the editor changes it.
- A stale SHA produces a conflict and retains the unsaved text in the form.
- Cover selection currently uses images already present in the configured folder.
  For Reef's generated images, it reads the tracked `scripts/covers.json` manifest
  used by the build, rather than looking for an ignored folder on GitHub.
  Uploading new media is not implemented yet.
- GitHub acknowledgement means saved, not deployed. The interface polls a protected
  manifest built from the exact Git blob hashes of the sources in the current build.
  It announces the website version only when that hash matches the saved article.
- Drafts are excluded from public routes as well as article lists, RSS and search.
  Use the private editor's Markdown preview before publishing.

## Standalone buyer installation

A buyer must use their own services and credentials. Never bind a buyer's installation
to Aloha Pixel's private store. The standalone adapter reuses the Aloha session and
email-code primitives, with an administrator allowlist, mandatory Turnstile,
atomic attempt limits, single-use codes and an HTTP-only signed session.

1. Copy `wrangler.backoffice.example.toml` to `wrangler.toml`. Choose your Worker
   name, your administrator email, your own GitHub repository and editorial branch.
2. Create a D1 database with `npx wrangler d1 create my-reef-auth`. Copy its ID into
   the configuration, then run `npx wrangler d1 execute my-reef-auth --remote
   --file scripts/backoffice-schema.sql` (one command).
3. Create a Turnstile widget for your exact final hostname and copy the public key.
   Verify your sending domain with Resend and set `ALOHA_MAIL_FROM` accordingly.
4. Set each secret through the interactive Wrangler prompt, never in source files:
   `npx wrangler secret put ALOHA_AUTH_SECRET` (at least 32 random characters),
   `npx wrangler secret put ALOHA_TURNSTILE_SECRET_KEY`,
   `npx wrangler secret put ALOHA_MAIL_KEY`, and
   `npx wrangler secret put GITHUB_CONTENT_TOKEN`. Restrict the GitHub token to
   Contents read/write on your repository and give it an expiry date.
5. Build with `ALOHA_BACKOFFICE=1 pnpm build`, then `npx wrangler deploy`.
   Set the same build variable in Cloudflare Workers Builds. Connect exactly the
   editorial branch and use `npx wrangler deploy --keep-vars` as the deploy command.
6. Open `/fr/secret-spot/` or `/secret-spot/`, sign in with an allowlisted email,
   create a draft and confirm the generated commit. Publish only when your build
   succeeds. The protected build manifest confirms which article version is live.

The `.cloudflare/` configuration is Aloha Pixel's private validation deployment;
it is not the buyer installation template. The public theme demo uses `ALOHA_DEMO_BACKOFFICE=1`, rejects every API request
before authentication and only serves the demonstration screens and sample JSON.
The buyer configuration omits that flag.

## Image cache and publication time

An unchanged photo is reused only when its source URL and local SHA-256 match
the previous successful download and its WebP width is sufficient. Changing the
URL, losing the cached file or corrupting it triggers a download.
`pnpm covers --refresh` forces a refresh. A non-image response cannot replace a
valid local photo. The cache lives in `node_modules/.cache/reef-covers.json`; a
clean installation downloads the photos again. This removes repeated downloads
when the cache and image files survive, not the rest of the Astro build or queue.
No fixed publication-time guarantee has been measured for the live back office.
