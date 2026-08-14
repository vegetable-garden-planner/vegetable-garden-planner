import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL ?? "https://yjwest9.dothome.co.kr").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` },
      { source: "/sanctum/:path*", destination: `${backendUrl}/sanctum/:path*` },
    ];
  },
};

export default nextConfig;
