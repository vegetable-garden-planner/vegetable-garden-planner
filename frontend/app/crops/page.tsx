import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { CropCatalog } from "@/features/crop-catalog/components/crop-catalog";
import {
  CROP_REFERENCES,
  CROP_SOURCES,
} from "@/features/crop-catalog/data/crop-references";

export const metadata: Metadata = {
  title: "대표 작물 정보 | 심어봄",
  description: "텃밭을 처음 시작할 때 참고할 대표 작물의 심는 시기와 간격을 확인하세요.",
};

export default function CropsPage() {
  const source = CROP_SOURCES[0];

  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-3 font-bold" href="/"><BrandMark /><span>심어봄</span></Link>
          <div className="flex gap-2">
            <Link className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-bold" href="/spaces">내 공간</Link>
            <Link className="rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white" href="/start">시작 진단</Link>
          </div>
        </header>

        <div className="mb-9 mt-12 sm:mt-16">
          <p className="text-sm font-bold text-leaf">대표 작물 10종</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">무엇을 심을지 살펴보세요</h1>
          <p className="mt-5 max-w-3xl leading-7 text-muted">다음 텃밭 배치 단계에서 사용할 작물 기준 데이터입니다. 심는 시기와 간격은 품종·지역·재배 환경에 따라 달라질 수 있으므로 일반적인 시작 기준으로 활용해 주세요.</p>
        </div>

        <CropCatalog crops={CROP_REFERENCES} />

        <aside className="mt-10 rounded-2xl bg-paper p-5 text-sm leading-6 text-muted">
          <p><strong className="text-ink">자료 출처:</strong> {source.organization}</p>
          <a className="font-bold text-leaf underline" href={source.url} rel="noreferrer" target="_blank">{source.title}</a>
          <p className="mt-1">최종 검토일: {source.reviewedAt}</p>
        </aside>
      </div>
    </main>
  );
}
