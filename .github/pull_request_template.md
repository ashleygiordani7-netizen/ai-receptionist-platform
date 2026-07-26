## Summary

<!-- What does this change do, and why? -->

## Milestone

<!-- Which milestone/task is this? Link the roadmap item if applicable. -->

- [ ] This change is scoped to the current milestone (see
      `docs/MILESTONE-ROADMAP.md`) — no future-milestone functionality was
      implemented early.

## Docs

- [ ] If this changes an architectural decision, the relevant doc was
      updated (`docs/TDD.md`) and/or a new ADR was added (`docs/adr/`).
- [ ] If this changes what's in scope for the current or a future
      milestone, `docs/MILESTONE-ROADMAP.md` was updated.

## Testing

- [ ] Tests were added/updated alongside the change (see CLAUDE.md's
      Testing Principles — no feature is complete without them).
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass locally.
- [ ] Edge cases and error handling were considered, not just the happy path.

## Multi-tenant / security (skip if not applicable)

- [ ] Every new or changed query is scoped by `organization_id`.
- [ ] A test proves Tenant A cannot access Tenant B's data for anything
      touched by this change.
- [ ] Every new/changed endpoint validates permissions — not just relying
      on frontend authorization.
- [ ] Provider SDKs (Vapi, Stripe, etc.) are only imported from their
      adapter package (`@platform/vapi-client`, `@platform/integrations`) —
      not directly from application code.

## Screenshots / recordings (UI changes only)

<!-- Before/after, if this touches apps/dashboard or apps/admin -->
