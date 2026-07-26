# apps/dashboard

The customer-facing (and, later, internal admin) web application. Next.js,
App Router.

## Rules

- Never communicates directly with Vapi, Stripe, Google, Twilio, or any
  other third-party provider. All external interaction goes through
  `apps/api`.
- Data flow: UI Components → Custom Hooks → Service Layer → `apps/api`.
- Server state (anything from `apps/api`) is managed with TanStack Query;
  client-only state stays local to the component that needs it.
- Presentational components render UI only; business/orchestration logic
  lives in custom hooks, not inside components.
- Backend authorization is always authoritative. Any permission checks here
  are UX affordances only (hiding/disabling actions a user isn't allowed to
  take), never a security boundary.

## Status

Project shell only — a single placeholder page, no real routes, no data
fetching, no components beyond what Next.js requires to build. Real pages
are introduced starting with the tenancy/auth milestone, following the
Dashboard Page Structure in the TDD.
