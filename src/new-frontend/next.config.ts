import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  reactStrictMode: true,
  ignoreBuildErrors: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
