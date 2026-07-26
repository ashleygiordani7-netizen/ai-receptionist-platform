# @platform/logger

Structured logging shared by every app and worker.

## Rules

- All logs are structured (not free-text) and consistently include, where
  available: request ID, correlation ID, organization ID, user ID.
- Never log secrets, tokens, passwords, or sensitive personal data — this is
  enforced by convention here (helpers should make it hard to accidentally
  log a raw payload that might contain sensitive fields).
- This package wraps the underlying logging library (e.g. pino) so the rest
  of the codebase depends on `@platform/logger`'s interface, not on the
  underlying library directly — keeps the implementation swappable.

## Status

Placeholder only. Implemented alongside the first app that needs to emit
logs (starting in the foundational milestone's backend scaffolding).
