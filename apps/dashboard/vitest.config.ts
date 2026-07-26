import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // No component tests exist yet, so a plain Node environment is
    // sufficient. Switch to "jsdom" (and add @testing-library/react) once
    // the milestone that introduces real dashboard component tests lands.
    environment: "node",
    globals: false,
    passWithNoTests: true,
  },
});
