import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { DiagnosisForm } from "@/features/start-diagnosis/components/diagnosis-form";

export const metadata: Metadata = {
  title: "시작 진단 | 심어봄",
  description: "내 공간과 생활 조건에 맞는 첫 식물과 시작 방법을 찾아보세요.",
};

export default function StartPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <Link className="flex items-center gap-3 font-bold" href="/">
            <BrandMark />
            <span>심어봄</span>
          </Link>
          <Link className="text-sm font-bold text-muted hover:text-leaf" href="/">홈으로</Link>
        </header>

        <div className="mb-8 mt-12 sm:mb-10 sm:mt-16">
          <p className="text-sm font-bold text-leaf">처음이어도 괜찮아요</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">나에게 맞는 시작 방법 찾기</h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted">
            공간과 햇빛, 돌볼 수 있는 시간을 알려주면 지금 시작하기 좋은 재배 공간과 식물을 안내해 드려요.
          </p>
        </div>

        <DiagnosisForm />
      </div>
    </main>
  );
}
