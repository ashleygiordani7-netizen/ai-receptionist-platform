const providerSdkPatterns = require("./packages/config/eslint/provider-sdk-patterns");

/**
 * Repo-root ESLint configuration.
 *
 * `root: true` stops ESLint's upward config search here. Every plain
 * TypeScript package/app (everything except apps/dashboard, which has its
 * own self-contained Next.js-specific config) is linted using this file —
 * they don't need an .eslintrc of their own.
 */
module.exports = {
  root: true,
  // require.resolve (not a bare "@platform/config/eslint/base" specifier):
  // ESLint's legacy shareable-config resolver auto-prefixes scoped-package
  // extends targets with "eslint-config-" unless the first path segment
  // already matches that convention, which mangles this path since our
  // package is "@platform/config", not "@platform/eslint-config". An
  // absolute path bypasses that resolver entirely.
  extends: [require.resolve("@platform/config/eslint/base")],
  ignorePatterns: [
    "node_modules",
    "dist",
    ".next",
    "coverage",
    ".turbo",
    "infrastructure",
  ],
  // Provider isolation, narrowed per adapter package. base.js blocks every
  // provider SDK pattern by default; each override below fully replaces
  // that rule for its matching files, re-applying the block for only the
  // *other* group (e.g. @platform/vapi-client may import the Vapi SDK, but
  // must still not import Stripe/Google/Twilio/HubSpot/Microsoft SDKs —
  // that's @platform/integrations' job, and vice versa). `overrides[].files`
  // globs resolve relative to this file's directory (the repo root), which
  // is why this lives here and not inside base.js (there it would resolve
  // relative to packages/config/eslint/ and never match).
  overrides: [
    {
      files: ["packages/vapi-client/src/**/*.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: providerSdkPatterns.integrations,
                message:
                  "@platform/vapi-client is the Vapi adapter only. Stripe/Google/" +
                  "Twilio/HubSpot/Microsoft SDKs belong in @platform/integrations.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["packages/integrations/src/**/*.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: providerSdkPatterns.vapi,
                message:
                  "@platform/integrations must not import the Vapi SDK. " +
                  "Vapi has its own dedicated adapter: @platform/vapi-client.",
              },
            ],
          },
        ],
      },
    },
    // packages/config's own *.js files (this file included, conceptually)
    // are CommonJS tooling config — .eslintrc.js, ESLint/Tailwind shareable
    // configs — which must use require()/module.exports by the conventions
    // of the tools that load them. That's not the "phantom CommonJS in
    // application code" pattern @typescript-eslint/no-var-requires exists
    // to catch, so it's off for this one package rather than repo-wide.
    {
      files: ["packages/config/**/*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
};
