# ADR 0007: Use Drizzle (drizzle-kit + drizzle-orm) over Prisma

**Status:** Accepted
**Date:** 2026-07-26
**Milestone:** M0

## Context

The TDD's tooling table (§2) explicitly leaves the ORM/migration tool
undecided: "Prisma or Drizzle — Drizzle if you want more raw SQL control at
scale," and asks for an ADR once a choice is made, since more than one viable
option was listed. M0 requires establishing migration tooling and the
expand/contract migration convention (Milestone Roadmap M0) before any real
schema exists.

Several patterns already planned for the milestones immediately following M0
depend on tight control over raw SQL and the transaction/session boundary:

- **M1's tenancy pattern**: Postgres RLS enforced via
  `SET LOCAL app.current_org`, scoped to one transaction, set immediately
  after tenant resolution (TDD §9). This requires the ORM to not obscure
  transaction boundaries or silently route queries across pooled connections
  in a way that could apply `SET LOCAL` to the wrong connection.
- **M5's partitioning strategy** for `calls`/`call_events`/`call_transcripts`
  (time-based partitioning applied while the tables are still empty).
- **M8's pgvector usage** for `kb_chunks`, and **M12's partition-drop-based
  retention purge** — both are easiest to express and reason about as
  close-to-SQL operations.

Prisma's schema DSL and generated client abstract further from raw SQL and
have historically had more friction with per-transaction session variables
and hand-written migration SQL living alongside generated ones. Drizzle's
migrations are plain SQL files, and its query builder is a thinner layer
that doesn't fight raw SQL escape hatches — better suited to the above.

## Decision

Use `drizzle-kit` for schema diffing/migration generation and the
migration-runner CLI, and `drizzle-orm` for the query builder once the first
real schema/repository code is written (M1 onward). `@platform/database`
remains the sole package that imports either — the rest of the codebase
depends on this package's repository interfaces, never on Drizzle directly
(per this package's own README and CLAUDE.md's Database Access principles).

For M0 specifically, `drizzle-kit` (devDependency) is the only *tool* this
package's code actually invokes — no repositories or query code exist yet.
`drizzle-orm` and `pg` are nonetheless both installed as direct
(non-dev) `dependencies`, not devDependencies, deliberately:

- `drizzle-orm` isn't optional tooling — `drizzle-kit generate`/`migrate`
  refuse to run without it present (verified directly: `drizzle-kit generate`
  fails with "Please install latest version of drizzle-orm" even against a
  schema file that exports nothing).
- `pg` is the runtime Postgres driver Drizzle's query builder will sit on top
  of. It's already unavoidably part of this package's dependency graph (this
  task's own integration test uses it to verify migration results directly),
  and M1 will need it as the real runtime driver within one milestone of M0.
  Classifying it as a devDependency now, only to reclassify it as a
  production dependency the moment M1 writes the first repository, is a
  dependency-only diff with no benefit — it doesn't reduce what's installed
  or what runs, only when the `package.json` bookkeeping catches up to
  reality. It's a `dependency` now instead. (`@types/pg` remains a
  devDependency — it ships no runtime code, only ambient types for the
  build, which is the correct classification regardless of `pg`'s own.)

No repository layer or query-time client construction exists yet — installing
`pg` as a `dependency` now is a classification correction, not new
functionality; nothing in this task's code imports it outside the test file.

## Migration tracking table: `schema_migrations`

The migration tracking table is named `schema_migrations` in the `public`
schema (via `drizzle.config.ts`'s `migrations: { table, schema }` option),
matching the Milestone Roadmap's explicit naming ("no domain tables yet
beyond a `schema_migrations` bookkeeping table") rather than drizzle-kit's
default (`__drizzle_migrations` in a separate `drizzle` schema).

This table is **not** hand-written as a migration. Drizzle creates and owns
it automatically — before applying anything in `migrations/`, `drizzle-kit
migrate` bootstraps its own tracking table using whatever name/schema
`drizzle.config.ts` configures. Writing a migration file that also does
`CREATE TABLE schema_migrations (...)` would create competing ownership of
the same table: Drizzle's own bootstrap logic already creates it under that
exact name, so a hand-written migration would either collide (table already
exists) or silently diverge from the shape Drizzle itself expects. Renaming
Drizzle's own mechanism via config is the correct way to satisfy the
roadmap's wording — inventing a parallel, manually-owned table with the same
name is not.

**Validation performed:** `drizzle-kit migrate` was run against a real
Postgres instance (`@electric-sql/pglite` — Postgres compiled to WASM, run
locally as a one-off check, not a project dependency) with the project's
exact `migrations: { table: "schema_migrations", schema: "public" }`
configuration. Confirmed directly via `information_schema.tables`:

- `public.schema_migrations` is created correctly.
- Running `migrate` a second time is idempotent (no error, no duplicate
  application).
- No domain tables exist, since no domain migrations exist yet — consistent
  with M0's scope.

This validation confirms the *mechanism* works; it is not a substitute for
CI's end-to-end check. `packages/database/src/migrate.integration.test.ts`
runs the same command against the project's real, configured PostgreSQL
environment (a `postgres:16` service container in
`.github/workflows/ci.yml`), which remains the authoritative verification —
the pglite run above only established confidence before that CI path existed
to check itself.

## Alternatives considered

- **Prisma**: rejected for the reasons above — the platform's own roadmap
  leans on raw-SQL-friendly patterns (RLS session variables, partitioning,
  pgvector, partition-drop retention) more than on a generated client's
  type-safe query DSL.
- **Raw `pg` with hand-written SQL migrations and no ORM at all**: rejected
  — loses schema-diffing (`drizzle-kit generate`), which is what keeps
  migrations deterministic and reviewable as the schema grows; would also
  mean reinventing migration-file bookkeeping that `drizzle-kit` already
  provides.

## Consequences

- `packages/database` gains its first real dependencies (`drizzle-orm`,
  `pg`; `drizzle-kit` and `@types/pg` as devDependencies) and its first real
  files: `drizzle.config.ts`, `src/schema.ts` (placeholder, empty until M1),
  and a committed `migrations/` folder (currently just the journal, no SQL
  files, since no domain tables exist yet).
- A repository layer and a runtime query-time Postgres client are still
  deferred to the milestone that writes the first repository — not now, per
  CLAUDE.md's "build only the current milestone." `drizzle-orm` being
  installed already doesn't change that; nothing in this task's code
  constructs a client or runs a query with it.
- CI must have a real Postgres instance available to verify migrations
  actually apply (a service container), not just that the schema diffs
  cleanly against an empty schema.
