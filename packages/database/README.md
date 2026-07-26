# @platform/database

The only package that talks to PostgreSQL directly. Owns the schema,
migrations, and the repository layer.

## Rules

- PostgreSQL is the source of truth for the entire platform. This package is
  the sole gateway to it.
- Controllers and application services never query the database directly —
  they depend on repositories exported from this package.
- Every tenant-owned table is scoped by `organization_id`, enforced via
  Postgres Row-Level Security in addition to application-level scoping
  (defense in depth — see Multi-Tenant Principles).
- Every schema change is a migration. Production databases are never
  hand-edited.
- ORM/query-builder choice is isolated here; the rest of the codebase depends
  on this package's repository interfaces, not on the ORM directly. Drizzle
  (`drizzle-kit` + `drizzle-orm`) is the chosen tool — see
  [ADR-0007](../../docs/adr/0007-drizzle-over-prisma.md) for why, over Prisma.

## Status

No domain schema exists yet — `src/schema.ts` is an empty placeholder, and
`migrations/` has no SQL files, only drizzle-kit's journal. The schema is
introduced incrementally, milestone by milestone, per the Milestone Roadmap
(starting with M1), never built ahead of the milestone that needs it.

Migration tooling itself, however, is real as of M0: the commands below work
today, and CI (`.github/workflows/ci.yml`) runs `db:migrate` against a real
Postgres service container on every push/PR.

## Migration convention

Every schema change is expand/contract, never a breaking single-step change:

1. **Expand**: add the new column/table/index without removing or renaming
   anything the running application still reads/writes.
2. Deploy the application code that uses the new shape.
3. **Contract**: once nothing depends on the old shape, remove it in a
   follow-up migration.

This keeps deploys and migrations decoupled — a migration can run ahead of
or behind an app deploy without either one breaking (CLAUDE.md: "Long-running
operations use queues" and the TDD's migration-pipeline guidance both assume
this; migrations are never auto-applied on app boot).

## Running migrations

Requires `DATABASE_URL` (see `.env.example`) pointing at a real Postgres
instance. Any local Postgres works — e.g.:

```bash
docker run --rm -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
```

```bash
pnpm --filter @platform/database db:generate   # diff src/schema.ts against migrations/, write new SQL
pnpm --filter @platform/database db:migrate    # apply pending migrations; creates public.schema_migrations on first run
pnpm --filter @platform/database db:check      # verify migrations/ and the schema aren't out of sync
```

The migration-tracking table is `public.schema_migrations` (configured in
`drizzle.config.ts`), matching the Milestone Roadmap's naming rather than
drizzle-kit's default (`__drizzle_migrations` in a separate `drizzle` schema).
