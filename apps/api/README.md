# apps/api

The core backend API. The single point of entry for the dashboard, and the
only application that decides business logic outcomes.

## Rules

- Layering is strict and one-directional: Controller → Application Service →
  Domain Service → Repository → Database.
- Controllers only validate, authenticate, authorize, delegate, and return
  responses. They never query the database, contain business logic, or call
  external providers directly.
- Every tenant-scoped request resolves its `organization_id` from the
  authenticated session — never from a client-supplied value — and every
  downstream query is scoped accordingly.
- External providers (Vapi, Stripe, calendar/CRM/SMS providers) are only ever
  reached through their respective adapter packages
  (`@platform/vapi-client`, `@platform/integrations`), never via a provider SDK
  imported directly into this app.
- Writes that need to reach an external provider follow the DB-first,
  async-sync pattern: save to Postgres and return success, then enqueue a
  job via `@platform/queue` to perform the provider sync.

## Status

Project shell only — no routes, controllers, services, or database access
exist yet. Implementation begins with the milestone covering tenancy, auth,
and organization management.
