# @platform/queue

Shared queue definitions and job payload contracts for all background/async
work: webhook processing, AI processing, document processing, notifications,
provider synchronization, email, imports, and exports.

## Rules

- Every job handler must be idempotent, retryable, observable, and
  recoverable — long-running or externally-dependent work is never performed
  inline in a request/response cycle.
- Job payload contracts (types) are defined here and shared between the
  producer (e.g. `apps/api`, `apps/webhooks`) and the consumer
  (`apps/workers`), so a producer and consumer can never silently drift out
  of sync on payload shape.
- The underlying broker (e.g. Redis/BullMQ, later Kafka/SQS) is isolated
  behind this package's interface so the transport can change without
  rewriting job logic elsewhere in the codebase.

## Status

Placeholder only. Introduced once the first genuinely async workflow exists
(webhook ingestion is the first candidate per the Milestone Roadmap).
