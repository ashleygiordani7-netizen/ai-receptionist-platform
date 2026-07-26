# ADR 0002: Revert to pnpm, enforced with a preinstall guard

**Status:** Accepted
**Date:** 2026-07-25
**Milestone:** M1
**Supersedes:** ADR-0001

## Context

ADR-0001 switched the repo from pnpm to npm workspaces to resolve confusion
caused by running `npm i` against a pnpm-configured repo (npm silently
ignored `pnpm-workspace.yaml` and only installed root-level dependencies).

On reflection, the actual tradeoff of npm's flat/hoisted `node_modules`
layout was reconsidered: as `packages/*` grows, npm's hoisting means each
package's own dependencies (and *their* transitive dependencies) get
flattened into a single shared `node_modules` tree. This creates two
compounding problems at monorepo scale:

1. **Phantom dependencies** — a package can accidentally resolve a
   dependency it never declared, because a sibling package's dependency
   happened to be hoisted to a shared location.
2. **Duplication and drift** — conflicting version requirements across
   packages can result in multiple copies of the same dependency nested at
   different levels, making the installed tree harder to reason about and
   slower to install as the number of packages grows.

pnpm avoids both: it uses a global content-addressable store and
symlinks, so each package only ever sees the dependencies it actually
declared, and shared dependencies are stored once on disk regardless of how
many packages use them. The original motivation for switching to npm (an
accidental `npm i`) is better solved by preventing that action outright
rather than by changing package managers.

## Decision

Revert to **pnpm** as the sole supported package manager, and add a
`preinstall` script (`only-allow pnpm`) that causes `npm install` or
`yarn install` to fail immediately with a clear message, rather than
silently producing a broken partial install. This directly addresses the
problem that originally motivated ADR-0001, without giving up pnpm's
stricter dependency isolation.

Concretely:
- `pnpm-workspace.yaml` restored.
- Root `package.json`: `packageManager: pnpm@9.0.0`, `engines.pnpm`
  restored, npm `workspaces` field removed.
- `preinstall: "npx only-allow pnpm"` added, with `only-allow` as a
  `devDependency` so the guard also works without network access after the
  first install.
- CI reverted to `pnpm/action-setup` + `pnpm install --frozen-lockfile`.
- `pnpm-lock.yaml` is the single committed lockfile; `package-lock.json`
  and `yarn.lock` are gitignored (and, with the guard in place, should
  never legitimately be generated in the first place).

## Alternatives considered

- **Stay on npm, just document it better** (i.e. keep ADR-0001's decision):
  rejected — documentation alone doesn't stop someone from running the
  wrong command, and the underlying hoisting tradeoff is a real, growing
  cost as the package count increases, not just a one-time onboarding
  friction.
- **Support both npm and pnpm simultaneously**: rejected — this was the
  original (pre-ADR-0001) setup and is what caused the confusion in the
  first place; two lockfiles for one workspace is not a stable end state.

## Consequences

- Contributors must install pnpm (`corepack enable && corepack prepare
  pnpm@9 --activate`) before working in this repo. This is a one-time setup
  cost, now paired with an explicit, actionable error message if skipped,
  rather than a silent partial install.
- Dependency isolation between packages is strict by default, which matters
  more as `packages/*` grows — this was the deciding factor over npm's
  lower onboarding friction.
- If pnpm's overhead ever becomes a genuine team pain point at a much larger
  scale, revisiting this is a package-manager swap plus removing the
  `preinstall` guard — not a restructuring of the codebase.
