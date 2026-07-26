/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile shared workspace packages consumed as TS source.
  transpilePackages: ["@platform/ui", "@platform/types", "@platform/shared"],
};

module.exports = nextConfig;
