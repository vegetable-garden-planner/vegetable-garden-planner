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
      description="심을 시기부터 필요한 공간, 관리 난이도까지 비교하고 나에게 맞는 작물과 꽃을 찾아보세요."
      eyebrow="작물 관리 가이드 · 13종"
      homeHref="/"
      heroImage="/figma/planner-hero.webp"
      title="무엇을 심고 어떻게 돌볼지 한눈에"
      width="full"
    >
      <CropCatalog />
    </AppPageShell>
  );
}
