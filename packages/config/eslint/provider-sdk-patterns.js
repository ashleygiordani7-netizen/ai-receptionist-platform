/**
 * Import-specifier patterns for third-party provider SDKs, grouped by the
 * one adapter package allowed to import them (see CLAUDE.md → "External
 * Provider Architecture" and "Vapi Principles").
 *
 * This is plain data, not an ESLint shareable config. It's consumed by:
 * - `eslint/base.js`, which blocks every pattern below everywhere by default.
 * - the repo-root `.eslintrc.js`, which narrows that block via `overrides`
 *   so each adapter package can import its own provider group but still not
 *   the other one (e.g. `@platform/vapi-client` may import the Vapi SDK, but not
 *   Stripe's).
 *
 * Keeping both packages in a single shared list (rather than duplicating
 * provider names in two config files) is what keeps the "block" and
 * "allow" sides from drifting out of sync as providers are added.
 *
 * Adding a new provider integration: add its SDK's import specifier(s) to
 * the appropriate group here *before* importing it anywhere. If it's a
 * genuinely new provider category (not Vapi and not covered by
 * @platform/integrations), it needs its own adapter package and its own
 * group + override, following the same pattern.
 */
module.exports = {
  vapi: ["@vapi-ai/**"],
  integrations: [
    "stripe",
    "@stripe/**",
    "googleapis",
    "google-auth-library",
    "twilio",
    "@hubspot/**",
    "@microsoft/**",
  ],
};
