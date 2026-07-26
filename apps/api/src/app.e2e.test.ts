import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Runs the real, compiled application as a subprocess and makes a real HTTP
 * request against it — verifying application bootstrap and the /health
 * endpoint together, against the exact same `node --import ... dist/main.js`
 * invocation `pnpm start` uses.
 *
 * This is deliberate, not incidental: NestJS's dependency injection relies
 * on decorator metadata (`emitDecoratorMetadata`) that only the real
 * TypeScript compiler emits — esbuild (which Vitest/Vite use for in-file TS
 * transforms) does not support this, so a same-process test using
 * `@nestjs/testing`'s `TestingModule` against source files would silently
 * resolve constructor-injected providers as `undefined` in this monorepo
 * (verified directly: a trivial @Injectable/@Controller pair reproduced this
 * exact failure here even though it worked in an isolated standalone
 * project — the discrepancy's exact cause wasn't fully pinned down, which is
 * itself reason enough not to depend on it). Requires `pnpm build` to have
 * run first — see package.json's `test` script.
 */

const PORT = 3999;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function waitForStartupLog(proc: ChildProcessWithoutNullStreams, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let output = "";

    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for the api server to start. Output so far:\n${output}`));
    }, timeoutMs);

    const onData = (chunk: Buffer): void => {
      output += chunk.toString();
      if (output.includes("api server started")) {
        clearTimeout(timer);
        proc.stdout.off("data", onData);
        resolve();
      }
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    proc.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`api process exited early (code ${code}). Output:\n${output}`));
    });
  });
}

describe("api bootstrap and /health", () => {
  let apiProcess: ChildProcessWithoutNullStreams;

  beforeAll(async () => {
    const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(PORT) };
    delete env["OTEL_EXPORTER_OTLP_ENDPOINT"];

    apiProcess = spawn(process.execPath, ["--import", "./dist/telemetry.js", "dist/main.js"], {
      env,
    });

    await waitForStartupLog(apiProcess, 10_000);
  }, 15_000);

  afterAll(() => {
    apiProcess.kill();
  });

  it("responds to GET /health with status ok", async () => {
    const response = await fetch(`${BASE_URL}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
