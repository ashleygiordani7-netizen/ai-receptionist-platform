# ADR 0001: Use npm workspaces instead of pnpm for the monorepo

**Status:** Superseded by ADR-0002
**Date:** 2026-07-25
**Milestone:** M1

## Context

The TDD originally recommended pnpm as the monorepo package manager,
managed with Turborepo. During initial M1 scaffolding, the repo was set up
with both a `pnpm-workspace.yaml` and an npm-compatible `workspaces` field
in parallel, to unblock a developer who was running `npm i` out of habit.
Running two package managers side by side produced exactly the confusion
you'd expect: `npm i` silently ignored `pnpm-workspace.yaml` and only
installed the root's dependencies, so app-level dependencies (e.g. `react`
in `apps/dashboard`) appeared to be "missing" even though they were
correctly declared.

## Decision

Standardize on **npm workspaces** as the single, canonical package manager
for this repository. Turborepo is unaffected — it works the same regardless
of which package manager resolves `node_modules`.

Concretely:
- `pnpm-workspace.yaml` removed.
- Root `package.json` declares `workspaces: ["apps/*", "packages/*"]`,
  no `packageManager` field pinning pnpm.
- CI (`.github/workflows/ci.yml`) uses `npm ci` / `npm run <script>`.
- `package-lock.json` is the single committed lockfile.

## Alternatives considered

- **pnpm** (the original recommendation): faster installs, lower disk usage
  via its content-addressable store, and stricter dependency resolution
  that prevents "phantom dependencies" (a package importing something it
  never declared, which happened to be hoisted into `node_modules` by a
  sibling package). These are real advantages, especially as the number of
  packages grows.
- **Nx**: more powerful task orchestration and dependency-graph tooling
  than Turborepo, but a heavier adoption curve than this project needs at
  this stage.

## Consequences

- **Simpler onboarding**: contributors don't need to install or learn a
  second package manager; `npm install` "just works" the way most
  JavaScript developers already expect.
- **One lockfile, one source of truth**: no risk of `pnpm-lock.yaml` and
  `package-lock.json` silently drifting apart.
- **Accepted tradeoff — phantom dependencies**: npm's flat/hoisted
  `node_modules` layout means a package could accidentally resolve a
  dependency it never declared in its own `package.json`, simply because a
  sibling package hoisted it. This is a real but manageable risk at this
  project's current size. If it becomes a recurring problem as the number
  of packages grows, revisiting pnpm is a package-manager swap, not a
  restructuring of the codebase — the workspace layout (`apps/*`,
  `packages/*`) is unaffected either way.
- Slightly slower installs and more disk usage than pnpm at scale — not a
  concern at this project's current size, worth re-evaluating only if
  install times become a measured pain point.
