# @platform/analytics

Aggregation, rollup, and query logic for tenant-facing analytics (call
volume, outcomes, sentiment, cost) and, later, warehouse-backed reporting.

## Rules

- Every analytics query is tenant-scoped; there is no query path in this
  package that can return cross-tenant data to a tenant-facing caller.
- Operational (fast, Postgres-rollup) analytics and heavier warehouse-backed
  reporting are distinct concerns within this package — the operational path
  must never be slowed down by heavy historical queries.
- This package computes and serves aggregates; it does not own raw call data
  (that belongs to `@platform/database`'s call-related repositories) and does
  not talk to Vapi or any provider directly.

## Status

Placeholder only. Implementation begins with the milestone covering
operational analytics, once real call data exists to validate metrics
against.
