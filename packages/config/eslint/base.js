/**
 * Shared base ESLint configuration.
 *
 * Applies to every plain TypeScript app/package via the repo-root
 * `.eslintrc.js` (which extends this file). apps/dashboard layers
 * Next.js-specific rules on top via `./nextjs.js` instead of using this
 * file directly.
 *
 * This is intentionally a general-purpose baseline (recommended rules +
 * a small number of house rules), not a type-aware (`parserOptions.project`)
 * configuration — that tradeoff is deliberate: type-aware linting requires
 * every package to keep its ESLint TS-project wiring in sync with its
 * tsconfig, which is a real maintenance cost not yet justified while most
 * packages contain no real source. Revisit if/when stricter type-aware
 * rules (e.g. no-floating-promises) become worth that cost.
 */
const providerSdkPatterns = require("./provider-sdk-patterns");

const PROVIDER_SDK_NOT_ALLOWED_MESSAGE =
  "Provider SDKs may only be imported from their adapter package " +
  "(@platform/vapi-client for Vapi; @platform/integrations for everything else). " +
  "Depend on the adapter's own exported interface instead — see CLAUDE.md " +
  "→ External Provider Architecture.";

module.exports = {
  root: false,
  env: {
    node: true,
    es2022: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist", ".next", "coverage", "node_modules"],
  rules: {
    // Warn rather than error on unused vars; a leading underscore marks
    // a parameter as intentionally unused (e.g. destructuring).
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    // Provider isolation: block every provider SDK import specifier by
    // default. The repo-root .eslintrc.js narrows this per adapter package
    // via `overrides` — see provider-sdk-patterns.js for the full rationale.
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: providerSdkPatterns.vapi, message: PROVIDER_SDK_NOT_ALLOWED_MESSAGE },
          { group: providerSdkPatterns.integrations, message: PROVIDER_SDK_NOT_ALLOWED_MESSAGE },
        ],
      },
    ],
  },
};
