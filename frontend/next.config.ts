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
    const backend = [
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` },
      { source: "/sanctum/:path*", destination: `${backendUrl}/sanctum/:path*` },
      { source: "/auth/:path*", destination: `${backendUrl}/auth/:path*` },
    ];

    /* ----------------------------------------------------------------
       ⚠️ 개발용 임시 블록 — 디자인 확인 전용 (TEMPORARY / DEV ONLY)

       로컬에 backend나 Google/Kakao OAuth 키가 없어도 로그인 이후 화면
       (/dashboard, /spaces, /seasons, /crops, /plans)의 UI를 볼 수 있게
       API 호출을 app/api/dev-mock 의 가짜 응답기로 보낸다.

       · production 빌드에서는 이 분기 자체가 실행되지 않는다.
       · 로컬 backend를 실제로 띄워 쓰려면 DEV_MOCK_AUTH=off 로 실행한다.
           (Windows PowerShell)  $env:DEV_MOCK_AUTH="off"; npm run dev
       · 지우는 방법: 이 if 블록과 frontend/app/api/dev-mock/ 폴더 삭제.
         기존 인증·API 코드는 손댄 곳이 없어 그대로 원상복구된다.
    ---------------------------------------------------------------- */
    if (process.env.NODE_ENV !== "production" && process.env.DEV_MOCK_AUTH !== "off") {
      return [
        { source: "/api/v1/:path*", destination: "/api/dev-mock/v1/:path*" },
        { source: "/sanctum/csrf-cookie", destination: "/api/dev-mock/csrf" },
        ...backend,
      ];
    }

    return backend;
  },
};

export default nextConfig;
