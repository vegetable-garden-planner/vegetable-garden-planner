"use client";

import { use } from "react";
import Link from "next/link";
import { AppPageShell } from "@/components/app-page-shell";
import { SessionAwareLink } from "@/components/session-aware-link";
import {
  CROP_CATEGORY_LABELS,
  CROP_DIFFICULTY_LABELS,
  GROWING_SPACE_LABELS,
  PLANTING_MATERIAL_LABELS,
} from "@/features/crop-catalog/data/crop-labels";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";

export default function CropDetailPage(
  props: PageProps<"/crops/[cropId]">,
) {
  const { cropId } = use(props.params);
  const catalog = useCropCatalog();
  if (catalog.status === "loading") return <PageMessage message="작물 정보를 불러오고 있습니다." />;
  if (catalog.status === "error") return <PageMessage message={catalog.message} error />;

  const crop = catalog.crops.find((candidate) => candidate.id === cropId);
  if (!crop) return <PageMessage message="작물 정보를 찾을 수 없습니다." error />;

  const source = catalog.sources.find((candidate) => candidate.id === crop.sourceId);
  const startPath = `/seasons/new?cropId=${encodeURIComponent(crop.id)}`;
  const startLabel = crop.plantingMaterial === "cut-flower"
    ? "꽃 관리 시작하기"
    : `${crop.name} 키우기 시작`;

  return (
    <AppPageShell
      backHref="/crops"
      backLabel="식물 목록"
      description={crop.summary}
      eyebrow={`${CROP_CATEGORY_LABELS[crop.category]} · ${crop.familyName}`}
      title={crop.name}
    >
        <section className="surface-panel p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-bold text-leaf">재배 핵심 정보</p>
              <p className="mt-2 max-w-2xl leading-7 text-muted">공간과 계절에 맞는 시작 시기와 관리 간격을 확인하세요.</p>
            </div>
            <span className="rounded-full bg-leaf-soft px-4 py-2 text-sm font-bold text-leaf-dark">{CROP_DIFFICULTY_LABELS[crop.difficulty]}</span>
          </div>

          <dl className="mt-8 grid gap-5 border-y border-ink/10 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="시작 형태" value={PLANTING_MATERIAL_LABELS[crop.plantingMaterial]} />
            <Fact label="시작 시기" value={crop.plantingPeriod.label} />
            <Fact label="수확·감상" value={crop.harvestPeriod.label} />
            <Fact label="포기 간격" value={`${crop.plantSpacingCm}cm`} />
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {crop.supportedSpaces.map((space) => <span className="rounded-full bg-cream px-3 py-1.5 text-sm font-bold text-muted" key={space}>{GROWING_SPACE_LABELS[space]}</span>)}
          </div>

          {crop.careGuide && (
            <section className="mt-9" aria-labelledby="care-guide-title">
              <p className="text-sm font-bold text-leaf">오래 건강하게 돌보기</p>
              <h2 className="mt-2 text-2xl font-bold" id="care-guide-title">받거나 데려온 첫날부터 이렇게 관리하세요</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <CareFact label="얼마나 함께할 수 있나요?" value={crop.careGuide.lifespan} />
                <CareFact label="빛" value={crop.careGuide.light} />
                <CareFact label="물" value={crop.careGuide.watering} />
                <CareFact label="온도와 자리" value={crop.careGuide.temperature} />
              </dl>
              <ol className="mt-5 space-y-3">
                {crop.careGuide.actions.map((action, index) => (
                  <li className="flex gap-3 rounded-2xl bg-leaf-soft/45 p-4 leading-6" key={action}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-leaf text-sm font-bold text-white">{index + 1}</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="mt-9 rounded-2xl bg-ink p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div>
              <p className="font-bold">내 공간에서 직접 관리해 볼까요?</p>
              <p className="mt-1 text-sm leading-6 text-white/70">공간과 기간을 정하면 관리 기록을 이어갈 수 있습니다.</p>
            </div>
            <SessionAwareLink
              anonymousHref={`/login?next=${encodeURIComponent(startPath)}`}
              anonymousLabel={startLabel}
              authenticatedHref={startPath}
              authenticatedLabel={startLabel}
              className="mt-4 inline-flex rounded-full bg-white px-5 py-3 font-bold text-leaf sm:mt-0"
            />
          </div>
        </section>

        {source && (
          <aside className="surface-panel mt-6 p-5 text-sm leading-6 text-muted">
            <p><strong className="text-ink">자료 출처:</strong> {source.organization}</p>
            <a className="font-bold text-leaf underline" href={source.url} rel="noreferrer" target="_blank">{source.title}</a>
            <p className="mt-1">최종 검토일: {source.reviewedAt}</p>
          </aside>
        )}
    </AppPageShell>
  );
}

function PageMessage({ error = false, message }: { error?: boolean; message: string }) {
  return (
    <main className="app-page grid place-items-center text-center">
      <div className="surface-panel max-w-md p-8">
        <p className={error ? "font-semibold text-[var(--color-danger)]" : "text-muted"} role={error ? "alert" : undefined}>{message}</p>
        <Link className="primary-action mt-5 px-5 py-3" href="/crops">작물 목록으로 돌아가기</Link>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>;
}

function CareFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-ink/10 p-4"><dt className="text-sm font-bold text-leaf">{label}</dt><dd className="mt-2 leading-6 text-muted">{value}</dd></div>;
}
