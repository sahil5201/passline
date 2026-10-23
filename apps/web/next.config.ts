import type { NextConfig } from "next"
import path from "node:path";

const nextConfig: NextConfig = {
   turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  transpilePackages: ["@passline/core", "@passline/db"],
}

export default nextConfig
