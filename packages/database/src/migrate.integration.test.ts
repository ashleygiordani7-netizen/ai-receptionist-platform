import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Client } from "pg";
import { describe, it, expect } from "vitest";

const databaseUrl = process.env["DATABASE_URL"];
const isRunningInCI = process.env["CI"] === "true";

// Locally, a missing DATABASE_URL just skips the migrate tests below (no
// Postgres to run them against). In CI, that same absence must fail loudly
// instead — a silent skip there would mean the migration path is never
// actually verified while CI still reports green. GitHub Actions sets
// CI=true in every job automatically, so this doesn't depend on any
// additional configuration beyond the postgres service already in
// .github/workflows/ci.yml.
if (isRunningInCI && !databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set in CI so migration integration tests run. " +
      "Check the PostgreSQL service configuration in CI.",
  );
}

const require = createRequire(import.meta.url);
// drizzle-kit's package.json `exports` map doesn't expose `./bin.cjs` as a
// resolvable subpath (only its library entry points, e.g. `.` and `./api`),
// so resolve the package root via its main entry instead and join the
// (unexported but present) CLI script from there.
const drizzleKitBin = join(dirname(require.resolve("drizzle-kit")), "bin.cjs");

interface ExecError extends Error {
  status: number | null;
  stderr: Buffer;
}

// Invokes the same `drizzle-kit <command>` that `pnpm run db:generate` /
// `db:migrate` do, resolved to its actual file and run via `node` directly
// rather than shelling out to `pnpm`/`drizzle-kit` by name — avoids relying
// on platform-specific PATH/shim resolution (e.g. `.cmd` shims on Windows).
function runDrizzleKit(command: "generate" | "migrate", env: NodeJS.ProcessEnv): void {
  execFileSync(process.execPath, [drizzleKitBin, command], { env, stdio: "pipe" });
}

describe("drizzle.config.ts", () => {
  it("fails fast with a clear error when DATABASE_URL is unset", () => {
    const envWithoutDatabaseUrl = { ...process.env };
    delete envWithoutDatabaseUrl["DATABASE_URL"];

    let thrown: ExecError | undefined;
    try {
      runDrizzleKit("generate", envWithoutDatabaseUrl);
    } catch (error) {
      thrown = error as ExecError;
    }

    expect(thrown?.status).toBe(1);
    expect(thrown?.stderr.toString()).toContain("DATABASE_URL is required");
  });
});

// Real integration tests against a real Postgres instance — each runs
// `drizzle-kit migrate` as a subprocess and then queries the resulting
// database directly, per CLAUDE.md's Integration Tests principle ("use
// isolated test databases"). Requires DATABASE_URL to point at a reachable,
// disposable Postgres — CI provides one as a service container; locally
// it's skipped unless you point DATABASE_URL at your own Postgres instance
// (see README.md).
describe.skipIf(!databaseUrl)("db:migrate", () => {
  it("creates the schema_migrations bookkeeping table in the public schema", async () => {
    runDrizzleKit("migrate", process.env);

    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query<{ table_name: string | null }>(
        "SELECT to_regclass('public.schema_migrations') AS table_name",
      );
      expect(result.rows[0]?.table_name).toBe("schema_migrations");
    } finally {
      await client.end();
    }
  });

  it("is repeatable — running migrate again against an already-migrated database does not error", () => {
    expect(() => runDrizzleKit("migrate", process.env)).not.toThrow();
  });
});
