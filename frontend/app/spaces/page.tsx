import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SpaceList } from "@/features/growing-space/components/space-list";

export const metadata: Metadata = {
  title: "내 재배 공간 | 심어봄",
  description: "등록한 실내 화분, 베란다와 텃밭 공간을 확인하세요.",
};

export default function SpacesPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-3 font-bold" href="/"><BrandMark /><span>심어봄</span></Link>
          <Link className="rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white" href="/spaces/new">공간 추가</Link>
        </header>
        <div className="mb-8 mt-12 sm:mt-16">
          <p className="text-sm font-bold text-leaf">나의 재배 공간</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">어디에서 식물을 키우고 있나요?</h1>
        </div>
        <SpaceList />
      </div>
    </main>
  );
}
