import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // self-hosted: a single server.js with only the files it needs
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
