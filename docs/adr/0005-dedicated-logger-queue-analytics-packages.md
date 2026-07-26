# ADR 0005: Extract dedicated logger, queue, and analytics packages

**Status:** Accepted
**Date:** 2026-07-26
**Milestone:** M0

## Context

The TDD's original folder structure (§2) doesn't list top-level packages for
logging, queue payload contracts, or analytics — it describes these as
technology choices and per-app subfolders instead: structured logging is
mentioned as a general requirement (§1.3's Observability layer), the job
queue is a per-app `apps/workers/src/queues/` subfolder, and analytics is
described only as an architectural layer (§14) and an `apps/api` module
(`modules/analytics`).

During M0 scaffolding, three cross-cutting concerns turned out to need a
shared home rather than living inside a single app:

1. **Logging**: every app and worker needs the same structured-logging
   shape (request ID, correlation ID, organization ID, user ID — per
   CLAUDE.md's Logging & Observability principles). Implementing this once
   per app risks each app drifting on what fields are included or how
   secrets are redacted.
2. **Queue contracts**: job payload shapes are produced by `apps/api` and
   `apps/webhooks` but consumed by `apps/workers`. If the payload type lived
   inside one of those apps, the others would depend on an app (violating
   CLAUDE.md's "apps depend on packages, packages don't depend on apps"),
   or worse, each side would maintain its own copy of the shape and drift
   apart silently.
3. **Analytics**: aggregation/rollup logic is used by `apps/api` (serving
   the dashboard's analytics endpoints) and will be used by the warehouse
   pipeline (§14.1's two-tier design) — a single shared package keeps the
   tenant-scoping guarantee ("no query path in this package can return
   cross-tenant data") in one place rather than reimplemented per consumer.

## Decision

Extract three dedicated packages:

- **`@platform/logger`**: wraps the underlying logging library (e.g. pino)
  so the rest of the codebase depends on this package's interface, not the
  underlying library directly.
- **`@platform/queue`**: shared queue definitions and job payload contracts,
  produced by `apps/api`/`apps/webhooks` and consumed by `apps/workers`, so
  producer and consumer can never silently drift on payload shape.
- **`@platform/analytics`**: aggregation, rollup, and query logic for
  tenant-facing analytics, kept separate from `@platform/database` (which
  owns raw call data) and with no direct provider access.

## Alternatives considered

- **Keep these as per-app modules/subfolders, per the TDD's original
  sketch**: rejected for `queue` specifically — a queue payload contract
  living inside the producing app would make the consuming app
  (`apps/workers`) depend on an app rather than a package, which CLAUDE.md's
  Architecture Principles rule out (dependencies always point downward, apps
  depend on packages). Logging and analytics could technically be
  duplicated per app, but that reintroduces exactly the drift risk described
  above for no benefit.

## Consequences

- TDD §2 updated to list `logger/`, `queue/`, and `analytics/` as top-level
  packages.
- Three more packages to maintain, but each with a single well-defined
  responsibility and a clear set of consumers, consistent with CLAUDE.md's
  "keep services small, focused and modular."
- `apps/workers` now depends on `@platform/queue` for payload types rather
  than a producing app's internal types — this is the specific dependency
  direction this extraction exists to make possible.
