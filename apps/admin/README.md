# apps/admin

The internal ops/superadmin console. Used by platform staff, not tenants —
organization provisioning, plan changes, suspension, system health, and
audited support tools (e.g. impersonation, call-event replay).

## Rules

- This is not a tenant-facing app. Nothing here is reachable by an
  organization member; it authenticates and authorizes platform staff only.
- Superadmin/impersonation actions are heavily audit-logged (see
  `audit_logs` in `@platform/database` and CLAUDE.md's Authentication &
  Authorization principles) — this app is exactly where that auditing
  matters most.
- Like every other app, external providers are only ever reached through
  `@platform/vapi-client` or `@platform/integrations`, never a provider SDK
  imported directly here.

## Status

Placeholder only. Per the Milestone Roadmap, M1's Definition of Done
requires a raw (even if unstyled) audit-log view here; full functionality
(organization provisioning, system health, support tools) lands across
later milestones, per TDD §8.
