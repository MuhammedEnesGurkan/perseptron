import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-build",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
