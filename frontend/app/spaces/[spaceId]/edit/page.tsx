import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { SpaceEditor } from "@/features/growing-space/components/space-editor";

export const metadata: Metadata = {
  title: "재배 공간 수정 | 심어봄",
  description: "등록한 재배 공간 정보를 수정하세요.",
};

export default async function EditSpacePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const loginHref = `/login?next=${encodeURIComponent(`/spaces/${spaceId}/edit`)}`;

  return (
    <AuthGate loginHref={loginHref}>
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <header className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3 font-bold" href="/"><BrandMark /><span>심어봄</span></Link>
            <Link className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-bold" href="/spaces">공간 목록</Link>
          </header>
          <div className="mb-8 mt-12 sm:mt-16">
            <p className="text-sm font-bold text-leaf">재배 공간 관리</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">공간 정보를 수정해요</h1>
          </div>
          <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-9">
            <SpaceEditor spaceId={spaceId} />
          </section>
        </div>
      </main>
    </AuthGate>
  );
}
