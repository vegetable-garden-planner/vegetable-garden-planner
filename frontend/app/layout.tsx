import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/features/auth/hooks/use-auth-session";
import { CropCatalogProvider } from "@/features/crop-catalog/hooks/use-crop-catalog";

const metadataBase = new URL(process.env.SITE_URL ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className="antialiased"
      data-scroll-behavior="smooth"
    >
      <body><AuthSessionProvider><CropCatalogProvider>{children}</CropCatalogProvider></AuthSessionProvider></body>
    </html>
  );
}
