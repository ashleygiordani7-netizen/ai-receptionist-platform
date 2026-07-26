# @platform/types

Shared types and validation schemas used by both frontend and backend, so
"what does a valid X look like" is defined exactly once.

## Rules

- Prefer schema validation (Zod) as the source of truth; derive static
  TypeScript types from schemas rather than maintaining both by hand.
- DTOs shared between `apps/dashboard` and `apps/api` live here so a request/
  response shape can never drift between client and server.
- This package must never depend on any other `@platform/*` package or on any
  runtime framework — it should be safe to import from anywhere (frontend,
  backend, workers) without pulling in unrelated dependencies.

## Status

Placeholder only. Populated incrementally as each milestone introduces new
domain concepts that need a shared shape.
