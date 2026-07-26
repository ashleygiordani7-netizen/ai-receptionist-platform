# @platform/vapi-client

The Vapi adapter. This is the **only** package permitted to import the Vapi
SDK or call the Vapi API directly.

## Rules

- Vapi is a replaceable voice provider, not the architecture. Nothing outside
  this package should know or care that Vapi specifically is being used.
- This package exposes our own domain verbs (e.g. `provisionAssistant`,
  `publishPromptVersion`, `assignPhoneNumber`), never Vapi's raw request/
  response shapes.
- PostgreSQL (via `@platform/database`) is always the source of truth.
  Application code saves to the database first and returns success; syncing
  to Vapi happens afterwards, asynchronously, via `@platform/queue`. This
  package's functions are invoked by that async sync path — never
  synchronously from a dashboard request, except for the narrow, genuinely
  latency-bound case of a live mid-call function/tool invocation.
- Sync failures must retry (handled in coordination with `@platform/queue`),
  and must never be silently swallowed.
- The dashboard never communicates with Vapi, directly or indirectly other
  than through this adapter, called from `apps/api`.

## Status

Placeholder only. Implementation begins with the milestone that introduces
the first real Vapi assistant/call loop.

## Enforcement

The "only package permitted to import the Vapi SDK" rule above is
lint-enforced: see `@platform/config`'s
[README → Provider isolation](../config/README.md#provider-isolation).
