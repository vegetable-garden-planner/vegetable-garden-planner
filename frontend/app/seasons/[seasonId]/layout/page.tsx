import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { GardenLayoutEditor } from "@/features/garden-layout/components/garden-layout-editor";

export const metadata: Metadata = {
  title: "텃밭 작물 배치 | 심어봄",
  description: "재배 시즌의 텃밭 격자를 만들고 작물을 배치하세요.",
};

export default async function SeasonLayoutPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const path = `/seasons/${seasonId}/layout`;

  return (
    <AuthGate loginHref={`/login?next=${encodeURIComponent(path)}`}>
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <AppHeader />
          <Link className="mt-8 inline-flex text-sm font-bold text-muted hover:text-leaf" href="/seasons">← 시즌 목록</Link>
          <div className="mb-8 mt-12 sm:mt-16">
            <p className="text-sm font-bold text-leaf">텃밭 격자 배치</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">어디에 무엇을 심을까요?</h1>
            <p className="mt-4 leading-7 text-muted">이번 단계에서는 격자 칸을 만들고 작물을 직접 배치합니다. 작물별 간격 검사는 다음 단계에서 연결됩니다.</p>
          </div>
          <GardenLayoutEditor seasonId={seasonId} />
        </div>
      </main>
    </AuthGate>
  );
}
