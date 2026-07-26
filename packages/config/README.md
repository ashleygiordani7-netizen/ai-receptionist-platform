# @platform/config

Shared tooling presets so apps and packages don't drift in linting or
design tokens.

## Contents

- `eslint/base.js` — the shared ESLint baseline (TypeScript-aware
  recommended rules). Consumed by the repo-root `.eslintrc.js`, which every
  plain TypeScript app/package inherits automatically via ESLint's normal
  upward config search — they don't need their own `.eslintrc` file.
- `eslint/nextjs.js` — extends `base.js` with Next.js's recommended rules
  (`next/core-web-vitals`). Consumed directly by `apps/dashboard/.eslintrc.js`,
  since a Next.js app needs its own self-contained (`root: true`) config
  rather than inheriting the plain base.
- `eslint/provider-sdk-patterns.js` — plain data (not itself a shareable
  config): the list of third-party provider SDK import specifiers, grouped
  by which adapter package may import them. Consumed by both `eslint/base.js`
  and the repo-root `.eslintrc.js` — see "Provider isolation" below.
- `tailwind/preset.js` — the shared Tailwind preset (design tokens: spacing,
  typography, color — currently minimal/empty pending real design-system
  work). Consumed by `apps/dashboard/tailwind.config.ts` via `presets: [...]`.

## What's deliberately *not* here

There is no shared TypeScript preset in this package. Every app/package
extends the repo-root `tsconfig.base.json` directly
(`"extends": "../../tsconfig.base.json"`), which already *is* the single,
real, shared TypeScript configuration — every package in the repo uses it.
An earlier version of this package also re-exported that file from
`typescript/base.json` as a discoverability alias; it was removed because it
added a second path to the same settings without adding any value, and
nothing consumed it. Prefer one canonical location over a wrapper that
exists only to make a shared-config folder look complete.

## Module resolution

`tsconfig.base.json` sets `"module": "ESNext"` / `"moduleResolution": "Bundler"`
— correct for anything a bundler ultimately resolves (packages/*, consumed by
both the bundler-based dashboard and directly-run backend apps; `Bundler`
mode doesn't enforce Node's stricter ESM resolution rules, which is what
lets one package tsconfig serve both consumption contexts).

Apps that run directly under Node with no bundler (`apps/api`,
`apps/webhooks`, `apps/workers`, `apps/admin`) override this to
`"module"`/`"moduleResolution": "NodeNext"` — not `"Node16"`, even though
they're equivalent today. TypeScript's own migration guidance for the
`node10` deprecation (TS 6.0) recommends `NodeNext` over `Node16` for
anything targeting Node.js directly: `Node16` is a name frozen to that one
Node generation, while `NodeNext` tracks Node's module resolution behavior
as it continues to evolve. `apps/dashboard` overrides to `"Bundler"`
explicitly (matching Next.js), same as the packages.

## Rules

- Apps and packages consume these presets by reference (`extends`,
  `presets: [...]`), never by copy-pasting their contents.
- Changes here apply platform-wide — treat edits to this package with the
  same care as a shared library change, since it can silently affect every
  app at once.
- Don't add a preset here "for completeness" unless something actually
  extends it. An unused preset is dead weight, not documentation.

## Status

`eslint/*` and `tailwind/preset.js` are real, wired-in configuration,
consumed by the repo root and `apps/dashboard` respectively. Design tokens
in the Tailwind preset are still a minimal placeholder — populated once
`@platform/ui` has real components to design against.

## Provider isolation

CLAUDE.md's "External Provider Architecture" (all providers use adapters;
application code should never depend directly on a provider SDK) is
lint-enforced, not just documentation:

- `eslint/base.js` blocks importing any pattern listed in
  `eslint/provider-sdk-patterns.js` (currently: Vapi, Stripe, Google
  Calendar, Twilio, HubSpot, Microsoft) from every package and app by
  default — including `apps/dashboard`, which must never import a provider
  SDK at all, no exceptions.
- The repo-root `.eslintrc.js` narrows that block via `overrides` scoped to
  `packages/vapi-client/src/**` and `packages/integrations/src/**`, so each
  adapter package can import *its own* provider group but still not the other
  one (e.g. `@platform/vapi-client` may import the Vapi SDK, but not Stripe's
  — that stays `@platform/integrations`' job).

Adding a new provider integration: add its SDK's import specifier(s) to
`eslint/provider-sdk-patterns.js` before importing it anywhere, in the
group matching whichever adapter package owns it.

## Version pins

- **TypeScript is pinned to `^6.0.0`, not the latest `7.0.x`.** TypeScript 7
  ships a new Go-based compiler (Project Corsa) and, as of this writing,
  `@typescript-eslint` v7 (used by `eslint/base.js`) only supports TypeScript
  `>=4.8.4 <6.1.0`. Moving to TS 7 before typescript-eslint adds support
  would break linting across the monorepo. Revisit once typescript-eslint
  publishes a release that supports TS 7.
- **ESLint stays on `^8.57.0`** (legacy `.eslintrc` config, not flat config)
  because `eslint-config-next@^14.2.0` — required for Next.js 14 — targets
  ESLint 8. Upgrading to ESLint 9 is a Next.js 15+ concern.
- **Vitest is pinned to `^4.1.0`** (latest *stable*; 5.0 is still in beta and
  requires Node >=22.12.0, which we don't want to force yet). Vitest 4.1
  treats Vite as a peer dependency rather than bundling it, so the root
  `package.json` also declares `vite: ^7.0.0` directly — without it, pnpm
  resolves an old transitive Vite 5.x that doesn't satisfy Vitest's peer
  range. Vite 7 requires Node >=20.19.0, which is why `engines.node` and
  `.nvmrc` were bumped from `20.0.0` to `20.19.0`.
