import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthSessionProvider } from "@/features/auth/hooks/use-auth-session";
import { CropCatalogProvider } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { SceneTransitionProvider } from "@/components/scene-transition";

/**
 * 서비스 전체 서체 — Pretendard (본문·제목·버튼·입력 등 제품 UI 전부).
 *
 * 저장소에 폰트 파일을 커밋해 자체 호스팅한다(app/fonts/, OFL 라이선스 재배포
 * 허용, 출처는 app/fonts/PRETENDARD_LICENSE.txt). 이전에는 CDN(jsdelivr)
 * stylesheet를 런타임에 불러왔는데, 그 요청이 실패하면 화면 전체가 시스템
 * 기본 서체로 조용히 되돌아가는 문제가 있었다. next/font/local은 빌드
 * 시점에 파일을 읽어 자체 도메인에서 서빙하므로 네트워크 요청 자체가
 * 없어 실패할 일이 없고, next/font/google과 달리 빌드 시 외부 네트워크도
 * 필요 없다.
 */
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

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
    <html className={`antialiased ${pretendard.variable}`} data-scroll-behavior="smooth" lang="ko">
      <body><AuthSessionProvider><CropCatalogProvider><SceneTransitionProvider>{children}</SceneTransitionProvider></CropCatalogProvider></AuthSessionProvider></body>
    </html>
  );
}
