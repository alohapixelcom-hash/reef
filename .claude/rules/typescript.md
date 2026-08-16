<!-- .claude/rules/typescript.md - the TypeScript posture: strict, alias imports, types derived from data, tested by selfchecks. -->

# TypeScript rules

## Baseline

- `extends: "astro/tsconfigs/strict"` with `strictNullChecks` on
  (tsconfig.json:2-5). Code must pass `pnpm check` clean. No `any`; use
  `unknown` at open boundaries, as the JSON-LD node does
  (src/js/schema.ts:4-8).
- Imports go through the aliases (tsconfig.json:8-13): `@components/*`,
  `@config/*`, `@layouts/*`, `@styles/*`, `@js/*`. Relative imports only
  inside a component's own folder (a primitive importing its sibling).

## Typing component props

- Extend the platform, do not retype it: `HTMLAttributes<"button">` from
  astro/types, unioned when a component renders either of two tags
  (src/components/ui/button/Button.astro:44-47 renders `<a>` or `<button>`).
- Wrappers with a configurable tag use `Polymorphic<{ as: Tag }>`
  (src/components/ui/reveal/Reveal.astro:7-10).
- Variant props come from the exported config: `VariantProps<typeof button>`
  (Button.astro:42). Export every `tv()` config from the component and
  re-export it from the folder's index.ts, so variants are reused, never
  copied.

## Types derived from data, not maintained beside it

- `IconName` is `keyof typeof icons` (src/components/svg/icons/icons.ts:206):
  adding an icon updates the type, and an unknown name fails the build
  instead of rendering a broken page.
- Config objects use `satisfies` to keep literal types alive
  (src/config/siteSettings.json.ts:6-9). Shared config shapes live in one
  place, src/config/types/configDataTypes.ts, and nowhere else.
- Content shapes are zod schemas in src/content.config.ts; pages get their
  types from `getCollection`, never from hand-written interfaces.

## Pure logic lives in src/js and fails loud

- Files in src/js are pure: no DOM, no Astro imports, deterministic
  input/output (src/js/pagination.ts, src/js/textUtils.ts,
  src/js/schema.ts).
- Programmer errors throw early and precisely: `paginate` refuses a
  non-integer size with a RangeError (pagination.ts:25-29). In a static
  build, a bad input is a bug to surface, not to paper over.
- Expected failures return discriminated results, not exceptions: a validator
  yields `{ ok: true, data } | { ok: false, fieldErrors }`, and callers switch
  on `ok`; nothing is thrown for a user typo.

## Selfchecks instead of a test framework

Pure logic is verified by executable selfcheck files, run directly with
Node (22.18+ strips types natively; the run command sits in each header):

- src/js/schema.selfcheck.ts (29 assertions)
- src/js/pagination.selfcheck.ts (34 assertions)

The pattern: `node:assert/strict`, a local `is()` counter, one console line
on success. When you add pure logic, ship its selfcheck next to it and note
it in the wiki. No test framework enters this repo for that.

## Style

Named exports for logic modules, default export only where a framework
expects one (config data files, Astro components). Functions get doc
comments stating the contract, including edge cases ("a price of zero is
real", schema.ts:146). One-line file header, 400 lines max, plain hyphens.
