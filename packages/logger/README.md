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

## Usage

```ts
import { createLogger } from "@platform/logger";

const logger = createLogger({ name: "api" });

// Scope a logger to one request/job so context doesn't need to be repeated
// on every call site.
const requestLogger = logger.child({
  request_id: "...",
  organization_id: "...",
});

requestLogger.info("handled request", { durationMs: 42 });
```

Log level defaults to `LOG_LEVEL` (see `.env.example`), then `"info"`.

## Redaction — known scope and limits

A fixed list of secret-shaped key names (`password`, `token`, `secret`,
`authorization`/`Authorization`, and common credential variants like
`accessToken`/`clientSecret`/`refreshToken` — see `SENSITIVE_KEYS` in
`logger.ts`) is redacted, including inside arrays, up to **two levels of
nesting**. This is pino's native `redact` option (via `fast-redact`), which
matches literal key names at fixed path depths — there's no built-in "any
depth" wildcard, and M0 has no domain logic yet to log anything deeper than
that. If a future milestone starts logging deeply nested third-party
payloads (e.g. M7 tool-call responses, M8 KB ingestion, M11 CRM/Slack
payloads), revisit this — either extend `REDACT_PATHS`' depth or replace it
with a depth-agnostic mechanism.

This only guards against secret-_shaped_ keys, not general PII (email, phone,
address) logged under an innocuous field name — no PII flows through the
platform yet as of M0, so that's out of scope until a milestone that
introduces it (e.g. M2's business profile, M5's call transcripts).

`Error` instances under the `err` or `error` key are serialized with their
message and stack trace (via `pino.stdSerializers.err`) rather than logging
as `{}` — the default behavior of `JSON.stringify(new Error(...))`.
