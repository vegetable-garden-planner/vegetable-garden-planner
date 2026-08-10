import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SpaceForm } from "@/features/growing-space/components/space-form";
import { isGrowingSpaceType } from "@/shared/domain/growing-environment";
import { AuthGate } from "@/features/auth/components/auth-gate";

export const metadata: Metadata = {
  title: "재배 공간 등록 | 심어봄",
  description: "실내 화분, 베란다 또는 텃밭 공간의 환경과 크기를 등록하세요.",
};

export default async function NewSpacePage(props: PageProps<"/spaces/new">) {
  const query = await props.searchParams;
  const requestedType = query.type;
  const initialType = typeof requestedType === "string" && isGrowingSpaceType(requestedType)
    ? requestedType
    : "indoor";
  const returnPath = `/spaces/new?type=${initialType}`;

  return (
    <AuthGate loginHref={`/login?next=${encodeURIComponent(returnPath)}`}>
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <AppHeader />
        <Link className="mt-8 inline-flex text-sm font-bold text-muted hover:text-leaf" href="/spaces">← 내 공간 목록</Link>
        <div className="mb-8 mt-10">
          <p className="text-sm font-bold text-leaf">재배 공간 등록</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">식물을 키울 공간을 알려주세요</h1>
          <p className="mt-4 leading-7 text-muted">등록한 공간은 로그인한 계정에 저장되며, 시즌과 작물 배치의 기준으로 사용됩니다.</p>
        </div>
        <section className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-9">
          <SpaceForm initialType={initialType} />
        </section>
      </div>
      </main>
    </AuthGate>
  );
}
