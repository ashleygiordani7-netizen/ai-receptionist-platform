/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile shared workspace packages consumed as TS source.
  transpilePackages: ["@platform/ui", "@platform/types", "@platform/shared"],
  // Produces a self-contained .next/standalone/ server bundle with only the
  // production dependencies it actually traces — the standard, official way
  // to Dockerize a Next.js app without shipping the full node_modules tree.
  //
  // On Windows without Developer Mode enabled, `pnpm build`/`next build` for
  // this app fails with `EPERM: operation not permitted, symlink` — this
  // step recreates pnpm's symlinked node_modules structure, which requires
  // symlink privileges Windows doesn't grant by default. CI (Linux) and
  // Docker builds are unaffected; enable Developer Mode (Settings → Privacy
  // & Security → For Developers) to build locally on Windows, or build via
  // WSL/a container instead.
  output: "standalone",
};

module.exports = nextConfig;
