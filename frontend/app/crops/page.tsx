import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SessionAwareLink } from "@/components/session-aware-link";
import { AuthHeaderMenu } from "@/features/auth/components/auth-header-menu";
import { CropCatalog } from "@/features/crop-catalog/components/crop-catalog";

export const metadata: Metadata = {
  title: "식물 정보 | 심어봄",
  description: "채소와 꽃의 재배 시기, 간격과 관리 방법을 확인하세요.",
};

export default function CropsPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-3 font-bold" href="/"><BrandMark /><span>심어봄</span></Link>
          <div className="flex items-center gap-2">
            <AuthHeaderMenu />
            <SessionAwareLink
              anonymousHref="/start"
              anonymousLabel="시작 진단"
              authenticatedHref="/dashboard"
              authenticatedLabel="내 텃밭"
              className="rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white"
            />
          </div>
        </header>

        <div className="mb-9 mt-12 sm:mt-16">
          <p className="text-sm font-bold text-leaf">채소와 꽃 13종</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">어떤 식물을 돌볼지 살펴보세요</h1>
          <p className="mt-5 max-w-3xl leading-7 text-muted">텃밭 작물뿐 아니라 선물 받은 꽃과 실내 화분 꽃의 관리 방법도 확인할 수 있습니다. 시기와 관리 기준은 품종·지역·환경에 따라 달라질 수 있으므로 시작 기준으로 활용해 주세요.</p>
        </div>

        <CropCatalog />
      </div>
    </main>
  );
}
