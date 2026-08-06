import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { SeasonEditor } from "@/features/growing-season/components/season-editor";

export const metadata: Metadata = {
  title: "재배 시즌 수정 | 심어봄",
  description: "등록한 재배 시즌 정보를 수정하세요.",
};

export default async function EditSeasonPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const loginHref = `/login?next=${encodeURIComponent(`/seasons/${seasonId}/edit`)}`;

  return (
    <AuthGate loginHref={loginHref}>
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <AppHeader />
          <Link className="mt-8 inline-flex text-sm font-bold text-muted hover:text-leaf" href="/seasons">← 시즌 목록</Link>
          <div className="mb-8 mt-12 sm:mt-16">
            <p className="text-sm font-bold text-leaf">재배 시즌 관리</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">시즌 정보를 수정해요</h1>
          </div>
          <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-9">
            <SeasonEditor seasonId={seasonId} />
          </section>
        </div>
      </main>
    </AuthGate>
  );
}
