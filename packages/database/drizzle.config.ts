import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required to run drizzle-kit commands. Copy .env.example to .env and set it, " +
      "or export it directly (see packages/database/README.md).",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  // Named and placed to match the Milestone Roadmap's own wording ("a
  // schema_migrations bookkeeping table") rather than drizzle-kit's default
  // (`__drizzle_migrations` in a separate `drizzle` schema).
  migrations: {
    table: "schema_migrations",
    schema: "public",
  },
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
