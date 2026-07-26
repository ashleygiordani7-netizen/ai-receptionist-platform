import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    passWithNoTests: true,
    // This app's own `build` (unlike sibling packages) emits real output
    // into dist/ (needed so it's runnable by plain `node` — see app.e2e.test.ts's
    // own comment on why). Vitest's default test-file glob matches compiled
    // `dist/**/*.test.js` too, which would otherwise be picked up as a
    // second, broken copy of every test file.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
