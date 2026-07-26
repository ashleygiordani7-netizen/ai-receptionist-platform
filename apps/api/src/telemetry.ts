import { NodeSDK } from "@opentelemetry/sdk-node";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";

/**
 * Starts OpenTelemetry tracing, instrumenting only HTTP and Fastify — the
 * only request pipeline this service has. Deliberately not using
 * `@opentelemetry/auto-instrumentations-node`, which would pull in
 * instrumentations for providers (Postgres, Redis, etc.) this app doesn't
 * use yet.
 *
 * Only starts if `OTEL_EXPORTER_OTLP_ENDPOINT` is set, so local development
 * without a collector doesn't produce export-failure noise. When it is set,
 * the SDK's own env-based configuration (not manual wiring here) resolves
 * the OTLP/HTTP trace exporter and endpoint per the OpenTelemetry spec
 * (verified directly against the installed sdk-node package rather than
 * assumed).
 *
 * This file runs at the top level, as a side effect of being imported — it
 * is NOT a function main.ts calls. It must be loaded via `--import` as a
 * preload step before main.ts (see package.json's dev/start scripts), not
 * imported normally from within main.ts. Instrumentation patches the
 * `http`/`fastify` modules via a require-hook that only affects modules not
 * yet loaded; ES module imports are always evaluated before any top-level
 * function call in the same file, so calling this from inside main.ts
 * (after main.ts's own `@nestjs/platform-fastify` import) would be too
 * late — fastify would already be loaded, unpatched, and no HTTP spans
 * would ever be produced. Verified empirically: a preload file's console
 * output ran before the main file's when invoked as
 * `tsx --import ./telemetry.ts main.ts`.
 */
if (process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]) {
  const sdk = new NodeSDK({
    serviceName: "api",
    instrumentations: [new HttpInstrumentation(), new FastifyInstrumentation()],
  });

  sdk.start();
}
