# ADR 0006: Formalize packages/integrations as the §15 plugin-architecture home

**Status:** Accepted
**Date:** 2026-07-26
**Milestone:** M0

## Context

The TDD's §2 folder structure doesn't list a top-level `integrations`
package, but the TDD clearly anticipates one architecturally:

- §1.3 names an "Integration layer" (Vapi client, CRM connectors, calendar
  connectors, SMS/email providers) as one of the seven logical layers.
- §15 ("Future Integrations") specifies a plugin architecture: an
  `integrations` table plus "a common interface (`connect()`, `disconnect()`,
  `sync()`, `handleWebhook()`, `getAvailableTools()`) that each provider
  implements," explicitly so that adding a provider is additive, not a
  rewrite.

Without a named package, that common interface and its provider adapters
(Google Calendar, Microsoft, HubSpot, Twilio, Stripe, per §15's priority
list) had no clear, singular home — risking each integration being bolted
onto `apps/api` ad hoc, which is exactly the outcome §15's plugin
architecture exists to prevent, and which CLAUDE.md's External Provider
Architecture explicitly rules out ("application code should never depend
directly on provider SDKs").

## Decision

`packages/integrations` is the package that implements §15's plugin
architecture and owns the common adapter interface: "provider adapters for
everything that is not Vapi: calendar providers (Google Calendar,
Microsoft), CRMs (HubSpot, Salesforce), communication providers (Twilio,
SendGrid), and payments (Stripe)," per its own README. This is a
formalization of what the TDD already specifies in prose, not a new
architectural decision — the TDD is updated (§2) to name it explicitly so
the folder structure matches the architecture described elsewhere in the
same document.

## Alternatives considered

- **One package per provider** (`packages/stripe`, `packages/google-calendar`,
  etc.): rejected — §15 explicitly calls for a *common* interface so adding
  a provider is "additive," which argues for one package with per-provider
  adapter modules inside it (as `@platform/vapi-client` is Vapi's single
  dedicated adapter), not N packages each reimplementing the same interface
  shape.
- **Fold into `apps/api`**: rejected — this is the same reasoning as
  `@platform/vapi-client`: provider SDKs and their adapter logic must be
  isolated to a package apps depend on, not embedded in an app, so the
  boundary is enforceable (see the ESLint provider-isolation rules in
  `packages/config/eslint/`) and so a future second consumer (e.g.
  `apps/workers` for background sync) doesn't have to depend on `apps/api`.

## Consequences

- TDD §2 updated to list `integrations/` alongside `vapi-client/`.
- No functional change — this package already existed and already has this
  scope; the TDD now names it so the folder structure isn't silently
  incomplete relative to §1.3/§15.
