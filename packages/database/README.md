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
- ORM/query-builder choice (e.g. Prisma or Drizzle) is isolated here; the rest
  of the codebase depends on this package's repository interfaces, not on the
  ORM directly.

## Status

Placeholder only. No schema exists yet. The schema is introduced
incrementally, milestone by milestone, per the Milestone Roadmap — never
built ahead of the milestone that needs it.
