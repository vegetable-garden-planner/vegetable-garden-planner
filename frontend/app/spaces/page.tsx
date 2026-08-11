import type { Metadata } from "next";
import Link from "next/link";
import { AppPageShell } from "@/components/app-page-shell";
import { SpaceList } from "@/features/growing-space/components/space-list";
import { AuthGate } from "@/features/auth/components/auth-gate";

export const metadata: Metadata = {
  title: "내 재배 공간 | 심어봄",
  description: "등록한 실내 화분, 베란다와 텃밭 공간을 확인하세요.",
};

export default function SpacesPage() {
  return (
    <AuthGate loginHref="/login?next=%2Fspaces">
      <AppPageShell
        action={<Link className="primary-action px-4 py-2.5 text-sm" href="/spaces/new">공간 추가</Link>}
        description="실내 화분부터 베란다와 텃밭까지, 식물이 자라는 환경을 한눈에 관리하세요."
        eyebrow="나의 재배 공간"
        title="어디에서 식물을 키우고 있나요?"
      >
        <SpaceList />
      </AppPageShell>
    </AuthGate>
  );
}
