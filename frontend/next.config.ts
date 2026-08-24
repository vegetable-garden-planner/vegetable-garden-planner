import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // 일부 호스팅(예: 학교 서버)의 보안 필터가 /_next/image 쿼리스트링을 차단해
  // 이미지 최적화 API 자체가 막힌다. 그런 환경에서는 배포용 .env에
  // NEXT_IMAGES_UNOPTIMIZED=true를 설정해 원본 파일을 그대로 서빙한다.
  images: {
    unoptimized: process.env.NEXT_IMAGES_UNOPTIMIZED === "true",
  },
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` },
      { source: "/sanctum/:path*", destination: `${backendUrl}/sanctum/:path*` },
      { source: "/auth/:path*", destination: `${backendUrl}/auth/:path*` },
    ];
  },
};

export default nextConfig;
