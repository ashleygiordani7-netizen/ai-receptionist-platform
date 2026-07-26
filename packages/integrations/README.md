# @platform/integrations

Provider adapters for everything that is not Vapi: calendar providers (Google
Calendar, Microsoft), CRMs (HubSpot, Salesforce), communication providers
(Twilio, SendGrid), and payments (Stripe), among future additions.

## Rules

- All providers are accessed through a common adapter interface (e.g.
  `connect`, `disconnect`, `sync`, `handleWebhook`, `getAvailableTools`).
  Application/domain code depends on this interface, never on a specific
  provider SDK directly.
- Each provider's SDK/API specifics are isolated to its own adapter module
  within this package — adding or replacing a provider should never require
  changes outside this package (beyond registering it).
- Credentials for connected integrations are referenced via the secrets
  manager, never stored as raw tokens in the database.
- Provider outages must be handled gracefully: retry transient failures,
  never assume a provider is always available, and degrade a live call
  gracefully if a mid-call provider request fails.

## Status

Placeholder only. The first concrete adapter (calendar) is introduced once
the tool/function bridge milestone is reached, per the Milestone Roadmap.

## Enforcement

The "application/domain code depends on the adapter interface, never a
specific provider SDK directly" rule above is lint-enforced: see
`@platform/config`'s
[README → Provider isolation](../config/README.md#provider-isolation).
