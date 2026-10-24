import type { NextConfig } from "next"
import path from "node:path";

const nextConfig: NextConfig = {
   turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  transpilePackages: ["@passline/core", "@passline/db"],
  allowedDevOrigins: ['192.168.1.153'],
}

export default nextConfig
