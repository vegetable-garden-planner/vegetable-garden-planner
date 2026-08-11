import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { SessionAwareLink } from "@/components/session-aware-link";
import { CropCatalog } from "@/features/crop-catalog/components/crop-catalog";

export const metadata: Metadata = {
  title: "식물 정보 | 심어봄",
  description: "채소와 꽃의 재배 시기, 간격과 관리 방법을 확인하세요.",
};

export default function CropsPage() {
  return (
    <AppPageShell
      action={(
        <SessionAwareLink
          anonymousHref="/start"
          anonymousLabel="시작 진단"
          authenticatedHref="/dashboard"
          authenticatedLabel="내 텃밭"
          className="primary-action px-4 py-2.5 text-sm"
        />
      )}
      description="텃밭 작물뿐 아니라 선물 받은 꽃과 실내 화분 꽃의 관리 방법도 확인할 수 있습니다. 품종과 환경에 따라 달라질 수 있으니 시작 기준으로 활용해 주세요."
      eyebrow="채소와 꽃 13종"
      homeHref="/"
      title="어떤 식물을 돌볼지 살펴보세요"
      width="full"
    >
      <CropCatalog />
    </AppPageShell>
  );
}
