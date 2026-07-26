# ADR 0003: Rename packages/db to packages/database

**Status:** Accepted
**Date:** 2026-07-26
**Milestone:** M0

## Context

The TDD's original folder structure (§2) names this package `db`. During M0
scaffolding, every other shared package was given a full, unabbreviated name
(`analytics`, `logger`, `queue`, `prompt-engine`), so `db` stood out as the
one abbreviated exception — and `db` is also a generic enough abbreviation
that it doesn't read as clearly as a Postgres-owning package name at a
glance, compared to sibling packages named for what they actually do.

## Decision

Use `packages/database` as the canonical name. `@platform/database` is "the
only package that talks to PostgreSQL directly. Owns the schema, migrations,
and the repository layer" per its own README — unabbreviated, consistent
with the naming convention every other package already follows.

## Alternatives considered

- **Keep `db`, matching the TDD literally**: rejected — inconsistent with
  every other package's naming convention, and no real benefit to matching
  the TDD's abbreviation once the inconsistency was noticed.

## Consequences

- TDD §2 updated to say `database/` instead of `db/`.
- No functional impact — this is a naming-only change; the package's scope
  (sole Postgres gateway, per CLAUDE.md's Database Access principles) is
  unchanged.
