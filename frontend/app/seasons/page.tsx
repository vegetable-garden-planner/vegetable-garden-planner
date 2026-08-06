import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { SeasonList } from "@/features/growing-season/components/season-list";

export const metadata: Metadata = {
  title: "재배 시즌 | 심어봄",
  description: "등록한 텃밭과 공간의 재배 시즌을 관리하세요.",
};

export default function SeasonsPage() {
  return (
    <AuthGate loginHref="/login?next=%2Fseasons">
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <AppHeader action={<Link className="rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white" href="/seasons/new">시즌 추가</Link>} />
          <div className="mb-8 mt-12 sm:mt-16">
            <p className="text-sm font-bold text-leaf">나의 재배 시즌</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">언제 무엇을 키울지 준비해요</h1>
          </div>
          <SeasonList />
        </div>
      </main>
    </AuthGate>
  );
}
