# @platform/auth

Authentication and authorization primitives shared across `apps/api`,
`apps/webhooks`, and `apps/workers`.

## Rules

- Authentication (who is the user?) and authorization (what may they do?)
  are implemented here as distinct, composable concerns — never merged into
  one another.
- The RBAC policy engine (`can(user, action, resource)`) lives here as the
  single source of truth for permission checks. It is consumed identically
  by backend guards and by the dashboard's UI-level gating — the backend
  check is always authoritative; any frontend use is UX-only.
- Tenant context (organization membership, role) always comes from the
  authenticated session, never from a client-supplied value.
- This package must never itself call third-party auth providers directly
  from application/domain code elsewhere — provider-specific logic (e.g. a
  managed auth provider's SDK) is isolated to an adapter within this package.

## Status

Placeholder only. Implementation begins with the milestone covering tenancy,
auth, and organization management.
