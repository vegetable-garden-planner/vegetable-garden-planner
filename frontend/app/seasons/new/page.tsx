import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { SeasonForm } from "@/features/growing-season/components/season-form";

export const metadata: Metadata = {
  title: "시즌 등록 | 심어봄",
  description: "재배 공간에 새로운 시즌과 기간을 등록하세요.",
};

export default async function NewSeasonPage(props: PageProps<"/seasons/new">) {
  const query = await props.searchParams;
  const initialSpaceId = typeof query.spaceId === "string" ? query.spaceId : "";
  const returnPath = initialSpaceId
    ? `/seasons/new?spaceId=${encodeURIComponent(initialSpaceId)}`
    : "/seasons/new";

  return (
    <AuthGate loginHref={`/login?next=${encodeURIComponent(returnPath)}`}>
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <AppHeader />
          <Link className="mt-8 inline-flex text-sm font-bold text-muted hover:text-leaf" href="/seasons">← 시즌 목록</Link>
          <div className="mb-8 mt-10">
            <p className="text-sm font-bold text-leaf">재배 시즌 등록</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">이번 재배 기간을 정해 주세요</h1>
            <p className="mt-4 leading-7 text-muted">시즌은 다음 단계에서 작물 배치와 재배 일정을 만드는 기준으로 사용됩니다.</p>
          </div>
          <section className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-9">
            <SeasonForm initialSpaceId={initialSpaceId} />
          </section>
        </div>
      </main>
    </AuthGate>
  );
}
