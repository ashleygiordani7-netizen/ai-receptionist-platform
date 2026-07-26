# @platform/shared

Small, genuinely cross-cutting utilities with no business logic and no
dependencies on other `@platform/*` packages: date/timezone helpers, result/
error-handling types, generic helper functions used across multiple apps or
packages.

## Rules

- Nothing goes here unless it is used by more than one app or package and
  has no domain-specific meaning. A rule of thumb: if it needs an
  `organization_id` to make sense, it does not belong in `shared`.
- Avoid this becoming a catch-all. Prefer a more specific package (e.g.
  `@platform/types`, `@platform/logger`) when one applies.

## Status

Placeholder only. Populated only as genuine cross-cutting needs emerge —
resisting the temptation to pre-build utilities before a second real
consumer exists.
