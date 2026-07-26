import type { Config } from "tailwindcss";
// Tailwind's own config loader expects CommonJS `require`, so this file
// intentionally mixes ESM `import` (for types) with `require` (for the
// runtime value). Rule name intentionally omitted below since it varies
// across @typescript-eslint versions (no-var-requires / no-require-imports).
// eslint-disable-next-line
const basePreset = require("@platform/config/tailwind/preset.js");

const config: Config = {
  presets: [basePreset],
  content: [
    "./src/**/*.{ts,tsx}",
    // Scan the shared design system too, so Tailwind classes used inside
    // @platform/ui components get compiled once it has real components.
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
