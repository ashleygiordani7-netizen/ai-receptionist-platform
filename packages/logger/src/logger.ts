import pino, { type Logger as PinoLogger } from "pino";

/**
 * Fields every log line should carry when available, per CLAUDE.md's
 * Logging & Observability principles and TDD §9's tenant-traceability rule
 * ("every internal service call and log line carries `organization_id` as a
 * first-class field"). Names are snake_case to match the field name used
 * everywhere else in the domain (DB columns, queue payloads), so a log line
 * can be correlated with a DB row or queue job without a translation step.
 */
export interface LogContext {
  request_id?: string;
  correlation_id?: string;
  organization_id?: string;
  user_id?: string;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  /**
   * `Error` instances under the `err` or `error` key are automatically
   * serialized with their message and stack trace — e.g.
   * `logger.error("db connect failed", { err })` — rather than logging as
   * `{}` (the default `JSON.stringify(new Error(...))` behavior).
   */
  error(message: string, meta?: Record<string, unknown>): void;
  /**
   * Returns a new logger that merges `context` into every subsequent log
   * line. Used to scope a logger to one request/job so request_id,
   * organization_id, etc. don't have to be passed to every call site.
   */
  child(context: LogContext): Logger;
}

export interface CreateLoggerOptions {
  /** Identifies which app/service emitted the log (e.g. "api", "workers"). */
  name: string;
  /** Defaults to LOG_LEVEL, then "info". */
  level?: string;
  /** Destination for log output. Defaults to stdout; overridable for tests. */
  stream?: NodeJS.WritableStream;
}

// Exact key names treated as secret-shaped. pino's redaction (via
// fast-redact) matches literal key names, not substrings or case-insensitive
// variants, so both namings are listed explicitly for each concept rather
// than relying on one spelling. Per CLAUDE.md: never log passwords, tokens,
// secrets, or sensitive personal data.
const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "Authorization",
  "api_key",
  "apiKey",
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "client_secret",
  "clientSecret",
  "secret_key",
  "secretKey",
  "private_key",
  "privateKey",
  "auth_token",
  "authToken",
  "session_token",
  "sessionToken",
];

// fast-redact matches paths at fixed depths — there is no "any depth"
// wildcard. M0 has no domain logic yet (apps/api is still a stub), so log
// payloads are shallow; covering the top level plus two levels of nesting is
// a deliberate, bounded trade-off, not a guarantee at arbitrary depth.
// Revisit if/when a milestone starts logging deeply nested third-party
// payloads (e.g. M7 tool-call responses, M8 KB ingestion, M11 CRM/Slack
// integration payloads).
const REDACT_PATHS = SENSITIVE_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]);

function wrap(pinoInstance: PinoLogger): Logger {
  return {
    debug: (message, meta) => pinoInstance.debug(meta ?? {}, message),
    info: (message, meta) => pinoInstance.info(meta ?? {}, message),
    warn: (message, meta) => pinoInstance.warn(meta ?? {}, message),
    error: (message, meta) => pinoInstance.error(meta ?? {}, message),
    child: (context) => wrap(pinoInstance.child(context)),
  };
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const pinoInstance = pino(
    {
      name: options.name,
      level: options.level ?? process.env["LOG_LEVEL"] ?? "info",
      redact: {
        paths: REDACT_PATHS,
        censor: "[REDACTED]",
      },
      // Ensures Error objects log their message/stack instead of `{}`,
      // whether logged under pino's reserved `err` key or the equally
      // common `error` — both map to pino's own standard serializer.
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    options.stream,
  );

  return wrap(pinoInstance);
}
