/**
 * ESLint configuration for apps/dashboard.
 *
 * `root: true` because this is a Next.js app with its own self-contained
 * config, rather than inheriting the repo-root `.eslintrc.js`.
 */
module.exports = {
  root: true,
  // require.resolve, not a bare "@platform/config/eslint/nextjs" specifier:
  // see the comment in the repo-root .eslintrc.js for why.
  extends: [require.resolve("@platform/config/eslint/nextjs")],
};
