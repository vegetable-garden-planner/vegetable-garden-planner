import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "텃밭 플래너 | 내 밭에 맞는 재배 계획",
  description:
    "밭 크기와 작물을 입력하면 배치 수량, 간격 경고, 재배 일정을 만들어주는 한국형 텃밭 계획 도구입니다.",
  openGraph: {
    title: "텃밭 플래너 | 내 밭에 맞는 재배 계획",
    description:
      "밭 크기와 작물을 입력하면 배치 수량, 간격 경고, 재배 일정을 한눈에 확인할 수 있어요.",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "텃밭 플래너 | 내 밭에 맞는 재배 계획",
    description: "내 밭에 꼭 맞는 재배 계획을 한눈에 확인하세요.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geist.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
