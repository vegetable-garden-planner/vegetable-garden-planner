import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/features/auth/hooks/use-auth-session";
import { CropCatalogProvider } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { SceneTransitionProvider } from "@/components/scene-transition";

/**
 * 서비스 전체 서체
 *
 *   Pretendard — 본문·제목·버튼·입력 등 제품 UI 전부
 *   Gugi       — 브랜드명 "심어봄" 로고타이프에만 (globals.css의 --font-brand)
 *
 * 두 서체를 root layout에서 한 번만 로드하고, 이후에는 globals.css의
 * --font-garden / --font-brand 로만 참조한다. (랜딩도 같은 로드를 재사용한다)
 * next/font/google 은 빌드 시 폰트를 내려받아야 해서 네트워크가 막힌 환경에서
 * 빌드가 깨진다. 여기서는 런타임 stylesheet로 불러 그 의존을 없앤다.
 */
const FONT_STYLESHEETS = [
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
  "https://fonts.googleapis.com/css2?family=Gugi&display=swap",
];

export const metadata: Metadata = {
  title: "심어봄 | 내 밭에 맞는 재배 계획",
  description:
    "밭 크기와 작물을 입력하면 배치 수량, 간격 경고, 재배 일정을 만들어주는 한국형 텃밭 계획 도구입니다.",
  openGraph: {
    title: "심어봄 | 내 밭에 맞는 재배 계획",
    description:
      "밭 크기와 작물을 입력하면 배치 수량, 간격 경고, 재배 일정을 한눈에 확인할 수 있어요.",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "심어봄 | 내 밭에 맞는 재배 계획",
    description: "내 밭에 꼭 맞는 재배 계획을 한눈에 확인하세요.",
  },
  appleWebApp: {
    capable: true,
    title: "심어봄",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="antialiased" data-scroll-behavior="smooth">
      <head>
        <link href="https://cdn.jsdelivr.net/" rel="preconnect" />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect" />
        {FONT_STYLESHEETS.map((href) => (
          <link href={href} key={href} rel="stylesheet" />
        ))}
      </head>
      <body><AuthSessionProvider><CropCatalogProvider><SceneTransitionProvider>{children}</SceneTransitionProvider></CropCatalogProvider></AuthSessionProvider></body>
    </html>
  );
}
