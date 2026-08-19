import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { SessionAwareLink } from "@/components/session-aware-link";
import { DiagnosisForm } from "@/features/start-diagnosis/components/diagnosis-form";

export const metadata: Metadata = {
  title: "시작 진단 | 심어봄",
  description: "내 공간과 생활 조건에 맞는 첫 식물과 시작 방법을 찾아보세요.",
};

export default function StartPage() {
  return (
    <AppPageShell
      action={(
        <SessionAwareLink
          anonymousHref="/"
          anonymousLabel="홈으로"
          authenticatedHref="/dashboard"
          authenticatedLabel="내 텃밭"
          className="primary-action px-4 py-2.5 text-sm"
        />
      )}
      description="공간과 햇빛, 돌볼 수 있는 시간을 알려주면 지금 시작하기 좋은 재배 공간과 등록된 식물 기준정보를 안내해 드려요."
      eyebrow="처음이어도 괜찮아요"
      heroImage="/figma/planner-hero.webp"
      homeHref="/"
      title="나에게 맞는 시작 방법 찾기"
      width="wide"
    >
      <DiagnosisForm />
    </AppPageShell>
  );
}
