import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "심어봄 | 내 밭에 맞는 재배 계획",
    short_name: "심어봄",
    description: "밭 크기와 작물을 입력하면 배치 수량, 간격 경고, 재배 일정을 만들어주는 한국형 텃밭 계획 도구입니다.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#079568",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
