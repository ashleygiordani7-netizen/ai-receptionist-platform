# apps/webhooks

Dedicated ingestion service for all inbound webhooks (Vapi, Stripe, OAuth
callbacks). Deployed and scaled independently from `apps/api` so a slower or
buggier API deploy can never risk dropping live-call webhook events.

## Rules

- Every webhook is signature-verified before anything else happens.
- The raw payload is persisted immediately, before any processing — this is
  the platform's durability guarantee against bugs, retries, or reprocessing
  needs.
- Processing is asynchronous: this service validates, persists, and enqueues
  a job via `@platform/queue`; `apps/workers` does the actual processing.
  The one deliberate exception is a genuinely latency-bound, synchronous
  path (e.g. a live mid-call function/tool invocation), which is handled
  inline because it is part of an active phone call, not a config sync.
- Webhook delivery is assumed to be at-least-once and unordered; every
  handler must be idempotent and must never assume event ordering.

## Status

Project shell only — no endpoints, signature verification, or processing
exist yet. Implementation begins with the milestone that introduces the
first real Vapi call loop.
