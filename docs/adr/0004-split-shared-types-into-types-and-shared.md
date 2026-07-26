# ADR 0004: Split packages/shared-types into packages/types and packages/shared

**Status:** Accepted
**Date:** 2026-07-26
**Milestone:** M0

## Context

The TDD's original folder structure (§2) names a single `shared-types`
package for "DTOs, Zod schemas shared FE/BE." During M0 scaffolding, two
distinct kinds of shared code emerged that don't belong together under one
name:

1. **Domain-shaped shared code**: Zod schemas and DTOs that define "what does
   a valid X look like" for shapes shared between `apps/dashboard` and
   `apps/api` (e.g. a valid `AssistantConfig`, a valid `CallOutcome`).
2. **Domain-agnostic shared code**: generic utilities with no business
   meaning at all — date/timezone helpers, result/error-handling types,
   small helper functions used across multiple apps or packages, none of
   which need an `organization_id` to make sense.

Keeping both under one `shared-types` package invites exactly the kind of
catch-all drift CLAUDE.md's Code Quality Principles warn against ("avoid
this becoming a catch-all"): a generic date-formatting helper and a
tenant-scoped DTO schema have no reason to be released, versioned, or
reasoned about together, and a single package makes it easy for
domain-specific logic to accumulate in what should be a dependency-free
utility package (or vice versa).

## Decision

Split into two packages:

- **`@platform/types`**: Zod schemas and the DTOs/types derived from them,
  shared between `apps/dashboard` and `apps/api` so a request/response shape
  can never drift between client and server. Must never depend on any other
  `@platform/*` package or runtime framework — safe to import from anywhere.
- **`@platform/shared`**: small, genuinely cross-cutting utilities with no
  business logic and no dependencies on other `@platform/*` packages. Rule of
  thumb (from its own README): if it needs an `organization_id` to make
  sense, it doesn't belong here.

## Alternatives considered

- **Keep one `shared-types` package**: rejected — the two concerns have
  different reasons to change (a new domain schema vs. a new generic
  helper) and different consumers in practice; splitting now, while both are
  still small, is far cheaper than untangling a grown catch-all package
  later.
- **Merge `shared` into `@platform/ui` or another existing package**:
  rejected — cross-cutting utilities are consumed by backend packages
  (workers, api) that have no reason to depend on the UI package.

## Consequences

- TDD §2 updated to list `types/` and `shared/` in place of `shared-types/`.
- Two small packages to maintain instead of one, but each with a single,
  unambiguous responsibility — consistent with CLAUDE.md's guidance to
  prefer composition and avoid catch-all packages.
- Future shared code has an explicit test to route it correctly: does it
  need `organization_id` (or any domain concept) to make sense? If yes, it's
  either `@platform/types` (if it's a shared schema/DTO) or a domain-specific
  package; if no, it's `@platform/shared`.
