# apps/workers

Background job processors for everything that must not run inline in a
request/response cycle: transcript processing, call scoring, knowledge base
embedding, analytics rollups, notification dispatch, and provider
synchronization (including the Vapi DB-first sync jobs).

## Rules

- Every job is idempotent, retryable, observable, and recoverable.
- Jobs are consumed from queues defined in `@platform/queue`; this app
  contains job handlers, not queue/broker plumbing.
- A failed job retries with backoff and, after exhausting retries, lands in
  a dead-letter state with alerting — it is never silently dropped.
- Workers scale independently and horizontally; no handler holds
  in-process state that would prevent running many instances concurrently.

## Status

Project shell only — no queue consumers or job handlers exist yet.
Implementation begins with the milestone that introduces the first
genuinely async workflow (webhook event processing).
