import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    passWithNoTests: true,
    // This package's `build` emits real output into dist/ (needed so
    // apps/api can load it as plain compiled Node output — see ADR
    // discussion in the M0 API task). Vitest's default test-file glob
    // matches compiled `dist/**/*.test.js` too, which would otherwise be
    // picked up as a second, broken copy of every test file.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
