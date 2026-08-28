"use client";

import Link from "next/link";
import { calculatePlantCount } from "@/features/garden-layout/application/calculate-plant-count";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import type { SunlightExposure } from "@/shared/domain/growing-environment";
import styles from "./garden-layout-summary.module.css";

const MAX_VISIBLE_SLOTS = 8;
const SUNLIGHT_RANK: Record<SunlightExposure, number> = { low: 0, partial: 1, full: 2 };

type FitLevel = "sufficient" | "insufficient" | "unknown";

/**
 * 텃밭 배치 결과 요약
 *
 * 화분 배치 결과(placement-summary)와 같은 시각적 언어를 쓰되, 마당·텃밭은
 * 화분 여러 개가 아니라 격자 구역 하나이므로 카드도 하나만 보여준다.
 * 실제 배치·공간·작물 데이터로 계산되는 것만 표시하고 지어내지 않는다.
 */
export function GardenLayoutSummaryView({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const cropCatalog = useCropCatalog();
  const layoutsState = useGardenLayouts();

  if (seasonsState.status === "error") return <Message message={seasonsState.message} onRetry={() => void seasonsState.reload()} />;
  if (spacesState.status === "error") return <Message message={spacesState.message} onRetry={() => void spacesState.reload()} />;
  if (cropCatalog.status === "error") return <Message message={cropCatalog.message} onRetry={() => window.location.reload()} />;
  if (layoutsState.status === "error") return <Message message={layoutsState.message} onRetry={() => void layoutsState.reload()} />;
  if (
    seasonsState.status === "loading"
    || spacesState.status === "loading"
    || cropCatalog.status === "loading"
    || layoutsState.status === "loading"
  ) {
    return <p className="surface-panel p-5 text-muted" role="status">배치 결과를 불러오고 있습니다.</p>;
  }

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <Message message="시즌을 찾을 수 없습니다." />;

  const space = spacesState.spaces.find((item) => item.id === season.spaceId);
  if (!space) return <Message message="시즌에 연결된 재배 공간을 찾을 수 없습니다." />;

  const layout = layoutsState.layouts.find((item) => item.seasonId === seasonId);
  if (!layout || layout.placements.length === 0) {
    return (
      <div className="surface-panel p-6 text-center">
        <p className="text-sm leading-6 text-muted">아직 텃밭에 배치한 작물이 없습니다.</p>
        <Link className="mt-4 inline-flex font-bold text-leaf underline" href={`/seasons/${seasonId}/layout`}>
          배치하러 가기 →
        </Link>
      </div>
    );
  }

  const plantCount = calculatePlantCount(layout.placements, cropCatalog.crops);
  const cropsById = new Map(cropCatalog.crops.map((crop) => [crop.id, crop]));
  const placedCrops = plantCount.crops.flatMap((item) => {
    const crop = cropsById.get(item.cropId);
    return crop ? [crop] : [];
  });
  const soilLiters = space.depthCm !== null ? (space.widthCm * space.lengthCm * space.depthCm) / 1000 : null;
  const sunlightFit = calculateSunlightFit(space, placedCrops);
  const totalCells = layout.columns * layout.rows;

  return (
    <div className="flex flex-col gap-6">
      <section className={`${styles.heroStats} grid`}>
        <Stat label="심은 칸" value={`${plantCount.totalCount}/${totalCells}칸`} />
        <Stat label="작물" value={`${plantCount.cropTypeCount}종`} />
        <Stat label="모종" value={`${plantCount.totalCount}포기`} />
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-bold">필요 준비물</h2>
        <dl className={styles.prepList}>
          <div className={styles.prepRow}>
            <span aria-hidden="true" className={styles.prepIcon}>🪴</span>
            <div><dt>흙</dt><dd>{formatLiters(soilLiters)}</dd></div>
          </div>
          <div className={styles.prepRow}>
            <span aria-hidden="true" className={styles.prepIcon}>🌱</span>
            <div><dt>모종</dt><dd>{plantCount.totalCount}개</dd></div>
          </div>
        </dl>
      </section>

      <section className="surface-panel p-6">
        <div className={styles.plotHeader}>
          <div>
            <p className="font-bold">{space.name}</p>
            <p className="text-xs text-muted">
              마당·텃밭 · {space.widthCm}×{space.lengthCm}cm · 한 칸 {layout.cellSizeCm}cm
            </p>
          </div>
          <span className="rounded-full bg-leaf-soft px-3 py-1.5 text-xs font-bold text-leaf-dark">
            햇빛 <FitBadge fit={sunlightFit} />
          </span>
        </div>

        <div className={styles.plotTray}>
          {plantCount.crops.map((item) => {
            const crop = cropsById.get(item.cropId);
            return (
              <div className={styles.slotGroup} key={item.cropId}>
                <div className={styles.slotRow}>
                  {Array.from({ length: Math.min(item.count, MAX_VISIBLE_SLOTS) }).map((_, index) => (
                    <span className={styles.plotSlot} key={index}>{item.cropName}</span>
                  ))}
                  {item.count > MAX_VISIBLE_SLOTS && (
                    <span className={styles.plotSlotMore}>+{item.count - MAX_VISIBLE_SLOTS}</span>
                  )}
                </div>
                {crop && <p className={styles.slotCaption}>권장 간격 {crop.plantSpacingCm}cm</p>}
              </div>
            );
          })}
        </div>
      </section>

      <GrowingPlanSteps crops={placedCrops} />

      <section
        className="rounded-3xl bg-[#0f513f] p-6 text-white shadow-[var(--shadow-md)] sm:flex sm:items-center sm:justify-between sm:gap-6"
        aria-labelledby="garden-summary-cta-title"
      >
        <div>
          <p className="text-sm font-bold text-[#ffd26f]">이 배치로 시작할까요?</p>
          <h2 className="mt-2 text-2xl font-bold" id="garden-summary-cta-title">
            배치를 수정하거나 이 계획으로 재배를 시작할 수 있어요
          </h2>
        </div>
        <div className="mt-5 flex shrink-0 gap-3 sm:mt-0">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3.5 font-bold text-white transition hover:bg-white/10"
            href={`/seasons/${seasonId}/layout`}
          >
            배치 수정하기
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 font-bold text-[#0f513f] transition hover:bg-[#eef8f3]"
            href={`/seasons/${seasonId}/tasks`}
          >
            이 계획으로 시작
          </Link>
        </div>
      </section>
    </div>
  );
}

function calculateSunlightFit(space: GrowingSpace, crops: readonly CropReference[]): FitLevel {
  if (space.sunlight === null) return "unknown";
  const spaceRank = SUNLIGHT_RANK[space.sunlight];

  for (const crop of crops) {
    if (crop.sunRequirement && SUNLIGHT_RANK[crop.sunRequirement] > spaceRank) return "insufficient";
  }
  return "sufficient";
}

function FitBadge({ fit }: { fit: FitLevel }) {
  if (fit === "unknown") return <span className="font-bold text-muted">확인 필요</span>;
  if (fit === "insufficient") return <span className="font-bold text-[var(--color-danger)]">부족할 수 있어요</span>;
  return <span className="font-bold text-leaf">적합</span>;
}

function GrowingPlanSteps({ crops }: { crops: readonly CropReference[] }) {
  if (crops.length === 0) return null;

  const plantingLabels = uniqueLabels(crops.map((crop) => crop.plantingPeriod.label));
  const harvestLabels = uniqueLabels(crops.map((crop) => crop.harvestPeriod.label));

  return (
    <section className="dashboard-journey" aria-labelledby="garden-summary-plan-title">
      <div className="dashboard-section-heading">
        <div>
          <p>재배 계획 요약</p>
          <h2 id="garden-summary-plan-title">파종부터 수확까지</h2>
        </div>
      </div>
      <ol>
        <li>
          <span aria-hidden="true">1</span>
          <div>
            <h3>파종</h3>
            <p>{crops.map((crop) => crop.name).join(" · ")} 심기</p>
            <strong>{plantingLabels.join(" · ")}</strong>
          </div>
        </li>
        <li>
          <span aria-hidden="true">2</span>
          <div>
            <h3>성장</h3>
            <p>햇빛과 물 관리를 이어가요.</p>
            <strong>구역별 안내 확인</strong>
          </div>
        </li>
        <li>
          <span aria-hidden="true">3</span>
          <div>
            <h3>수확</h3>
            <p>작물별 수확 시기를 확인해요.</p>
            <strong>{harvestLabels.join(" · ")}</strong>
          </div>
        </li>
      </ol>
    </section>
  );
}

function uniqueLabels(labels: readonly string[]): string[] {
  return Array.from(new Set(labels));
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatLiters(liters: number | null): string {
  if (liters === null) return "확인 필요";
  return `${Math.round(liters * 10) / 10}L`;
}

function Message({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-[#fff4f2] p-5 text-[var(--color-danger)]" role="alert">
      <p className="font-semibold">{message}</p>
      {onRetry ? (
        <button className="mt-4 inline-flex font-bold underline" onClick={onRetry} type="button">다시 시도</button>
      ) : (
        <Link className="mt-4 inline-flex font-bold underline" href="/seasons">시즌 목록으로 돌아가기</Link>
      )}
    </div>
  );
}
