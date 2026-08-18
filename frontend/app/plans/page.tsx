import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { SessionAwareLink } from "@/components/session-aware-link";
import { PlanOfferings } from "@/features/billing/components/plan-offerings";

export const metadata: Metadata = {
  title: "무료·프로 기능 | 심어봄",
  description: "심어봄이 무료로 제공하는 식물 관리 기능과 앞으로 제공할 프로 자동 관리 기능을 확인하세요.",
};

export default function PlansPage() {
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
      description="꽃을 살리고 식물을 시작하는 데 필요한 정보는 무료로 제공합니다. 프로는 날씨와 상태를 반영해 놓치기 쉬운 관리를 먼저 챙겨 주는 요금제로 준비하고 있습니다."
      eyebrow="심어봄의 이용 방식"
      heroSize="compact"
      homeHref="/"
      title="정보는 무료로, 반복 관리는 더 똑똑하게"
      width="wide"
    >
      <PlanOfferings />
    </AppPageShell>
  );
}
