import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { PlanBuilder } from "@/features/start-diagnosis/components/plan-builder";

export const metadata: Metadata = {
  title: "배치 준비 중 | 심어봄",
  description: "추천 구성을 배치 화면에서 바로 수정할 수 있게 준비합니다.",
};

export default function StartPlanPage() {
  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath("/start/plan")}`}>
      <AppPageShell
        description="곧 배치 화면에서 작물과 포기 수를 확인하실 수 있어요."
        eyebrow="배치 준비"
        heroSize="compact"
        title="조금만 기다려 주세요"
      >
        <PlanBuilder />
      </AppPageShell>
    </AuthGate>
  );
}
