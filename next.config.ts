import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ready for Capacitor static export in native builds
  // output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
