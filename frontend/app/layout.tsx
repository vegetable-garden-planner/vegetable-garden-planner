import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

function getMetadataBase() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "심어봄 | 작은 텃밭의 오늘을 돌봐요",
  description: "작물의 성장 상태와 오늘의 할 일을 한눈에 확인하는 텃밭 관리 서비스입니다.",
  openGraph: {
    title: "심어봄 | 작은 텃밭의 오늘을 돌봐요",
    description: "작물의 성장 상태와 오늘의 할 일을 한눈에 확인하세요.",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "심어봄 | 작은 텃밭의 오늘을 돌봐요",
    description: "매일의 작은 관리가 풍성한 수확을 만듭니다.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geist.variable} antialiased`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
