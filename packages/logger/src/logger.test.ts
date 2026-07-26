import { Writable } from "node:stream";
import { describe, it, expect } from "vitest";
import { createLogger } from "./logger";

function createCaptureStream() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { stream, lines };
}

function firstEntry(lines: string[]): Record<string, unknown> {
  return JSON.parse(lines[0] ?? "{}");
}

describe("createLogger", () => {
  it("emits structured JSON with the message and service name", () => {
    const { stream, lines } = createCaptureStream();
    const logger = createLogger({ name: "api", level: "debug", stream });
    logger.info("server started");

    const entry = firstEntry(lines);
    expect(entry["msg"]).toBe("server started");
    expect(entry["name"]).toBe("api");
  });

  it("falls back to LOG_LEVEL, then info, when level is omitted", () => {
    const originalLogLevel = process.env["LOG_LEVEL"];
    try {
      delete process.env["LOG_LEVEL"];
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", stream });
      logger.debug("should be suppressed by default info level");
      logger.info("should appear");

      expect(lines).toHaveLength(1);
      expect(firstEntry(lines)["msg"]).toBe("should appear");

      process.env["LOG_LEVEL"] = "debug";
      const { stream: envStream, lines: envLines } = createCaptureStream();
      const envLogger = createLogger({ name: "api", stream: envStream });
      envLogger.debug("visible because LOG_LEVEL=debug");

      expect(envLines).toHaveLength(1);
      expect(firstEntry(envLines)["msg"]).toBe("visible because LOG_LEVEL=debug");
    } finally {
      if (originalLogLevel === undefined) {
        delete process.env["LOG_LEVEL"];
      } else {
        process.env["LOG_LEVEL"] = originalLogLevel;
      }
    }
  });

  describe("child()", () => {
    it("merges request-scoped context into every subsequent line", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      const requestLogger = logger.child({
        request_id: "req-1",
        correlation_id: "corr-1",
        organization_id: "org-1",
        user_id: "user-1",
      });
      requestLogger.info("handled request");

      const entry = firstEntry(lines);
      expect(entry["request_id"]).toBe("req-1");
      expect(entry["correlation_id"]).toBe("corr-1");
      expect(entry["organization_id"]).toBe("org-1");
      expect(entry["user_id"]).toBe("user-1");
    });

    it("does not leak context between sibling children of the same parent", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      const requestA = logger.child({ request_id: "req-a" });
      const requestB = logger.child({ request_id: "req-b" });

      requestA.info("from A");
      requestB.info("from B");
      requestA.info("from A again");

      expect(lines).toHaveLength(3);
      expect(firstEntry([lines[0] ?? ""])["request_id"]).toBe("req-a");
      expect(firstEntry([lines[1] ?? ""])["request_id"]).toBe("req-b");
      expect(firstEntry([lines[2] ?? ""])["request_id"]).toBe("req-a");
    });
  });

  describe("redaction", () => {
    it("redacts top-level secret-shaped fields", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      logger.info("auth attempt", { password: "hunter2", token: "abc123" });

      const entry = firstEntry(lines);
      expect(entry["password"]).toBe("[REDACTED]");
      expect(entry["token"]).toBe("[REDACTED]");
    });

    it("redacts secret-shaped fields nested up to two levels deep", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      logger.info("nested payload", { a: { b: { password: "buried-secret" } } });

      const entry = firstEntry(lines) as { a: { b: { password: string } } };
      expect(entry.a.b.password).toBe("[REDACTED]");
    });

    // Documents a known, accepted M0 limitation rather than leaving it only
    // as a comment: fast-redact matches fixed-depth paths, not "any depth."
    // If this starts failing because redaction was made depth-unbounded,
    // update this test rather than treat it as a regression — see the
    // REDACT_PATHS comment in logger.ts for when to revisit this trade-off.
    it("does NOT redact secrets nested beyond the documented two-level bound", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      logger.info("deeply nested payload", {
        a: { b: { c: { password: "not-redacted-by-design" } } },
      });

      const entry = firstEntry(lines) as { a: { b: { c: { password: string } } } };
      expect(entry.a.b.c.password).toBe("not-redacted-by-design");
    });

    it("redacts secret-shaped fields regardless of casing convention", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      logger.info("varied naming", {
        accessToken: "leak-1",
        clientSecret: "leak-2",
        Authorization: "Bearer leak-3",
        api_key: "leak-4",
      });

      const entry = firstEntry(lines);
      expect(entry["accessToken"]).toBe("[REDACTED]");
      expect(entry["clientSecret"]).toBe("[REDACTED]");
      expect(entry["Authorization"]).toBe("[REDACTED]");
      expect(entry["api_key"]).toBe("[REDACTED]");
    });

    it("redacts secret-shaped fields inside arrays", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      logger.info("batch", { users: [{ password: "one" }, { password: "two" }] });

      const entry = firstEntry(lines) as { users: Array<{ password: string }> };
      expect(entry.users[0]?.password).toBe("[REDACTED]");
      expect(entry.users[1]?.password).toBe("[REDACTED]");
    });

    it("does not redact non-sensitive fields", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      logger.info("profile update", { display_name: "Acme Co", phone: "+15555550100" });

      const entry = firstEntry(lines);
      expect(entry["display_name"]).toBe("Acme Co");
      expect(entry["phone"]).toBe("+15555550100");
    });
  });

  describe("error logging", () => {
    it("serializes Error message and stack under the conventional `err` key", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      logger.error("db connect failed", { err: new Error("connection refused") });

      const entry = firstEntry(lines) as { err: { message: string; stack: string } };
      expect(entry.err.message).toBe("connection refused");
      expect(entry.err.stack).toContain("Error: connection refused");
    });

    it("serializes Error message and stack even under a non-conventional key", () => {
      const { stream, lines } = createCaptureStream();
      const logger = createLogger({ name: "api", level: "debug", stream });
      logger.error("upstream call failed", { error: new Error("timeout") });

      const entry = firstEntry(lines) as { error: { message: string; stack: string } };
      expect(entry.error.message).toBe("timeout");
      expect(entry.error.stack).toContain("Error: timeout");
    });
  });

  it("suppresses levels below the configured threshold", () => {
    const { stream, lines } = createCaptureStream();
    const logger = createLogger({ name: "api", level: "warn", stream });
    logger.info("should not appear");
    logger.warn("should appear");

    expect(lines).toHaveLength(1);
    expect(firstEntry(lines)["msg"]).toBe("should appear");
  });
});
