/**
 * ESLint configuration for Next.js apps (apps/dashboard).
 *
 * Layers Next.js's recommended rules (accessibility checks, Core Web
 * Vitals-affecting patterns, etc.) on top of the shared base config.
 * `next/core-web-vitals` is listed last so its React/Next-specific rules
 * take precedence over the generic base where the two overlap.
 */
module.exports = {
  root: false,
  extends: ["./base.js", "next/core-web-vitals"],
};
