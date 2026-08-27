"use client";

import Link from "next/link";
import { GROWING_SPACE_LABELS } from "@/features/crop-catalog/data/crop-labels";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import {
  buildPlacementSummary,
  type ContainerSummary,
  type FitLevel,
} from "@/features/container-placement/domain/placement-summary";
import { useContainerPlacements } from "@/features/container-placement/hooks/use-container-placements";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import { isGrowingSpaceType } from "@/shared/domain/growing-environment";

/**
 * 화분 배치 결과 요약
 *
 * 배치 캔버스에서 저장하면 이 화면으로 넘어온다. "배치 이유"나 구체적인
 * 재배 일수처럼 카탈로그에 없는 데이터는 지어내지 않고, 실제 배치·화분·
 * 작물 데이터로 계산되는 것만 보여준다.
 */
export function PlacementSummaryView({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const cropCatalog = useCropCatalog();
  const placementsState = useContainerPlacements(seasonId);

  if (seasonsState.status === "error") return <Message message={seasonsState.message} onRetry={() => void seasonsState.reload()} />;
  if (spacesState.status === "error") return <Message message={spacesState.message} onRetry={() => void spacesState.reload()} />;
  if (cropCatalog.status === "error") return <Message message={cropCatalog.message} onRetry={() => window.location.reload()} />;
  if (placementsState.status === "error") return <Message message={placementsState.message} onRetry={() => void placementsState.reload()} />;
  if (
    seasonsState.status === "loading"
    || spacesState.status === "loading"
    || cropCatalog.status === "loading"
    || placementsState.status === "loading"
  ) {
    return <p className="surface-panel p-5 text-muted" role="status">배치 결과를 불러오고 있습니다.</p>;
  }

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <Message message="시즌을 찾을 수 없습니다." />;

  const summary = buildPlacementSummary(
    placementsState.placements.placements,
    spacesState.spaces,
    cropCatalog.crops,
  );

  if (summary.containerCount === 0) {
    return (
      <div className="surface-panel p-6 text-center">
        <p className="text-sm leading-6 text-muted">아직 화분에 배치한 작물이 없습니다.</p>
        <Link className="mt-4 inline-flex font-bold text-leaf underline" href={`/seasons/${seasonId}/placements`}>
          배치하러 가기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-panel grid grid-cols-3 gap-4 p-6 text-center">
        <Stat label="화분" value={`${summary.containerCount}개`} />
        <Stat label="작물" value={`${summary.cropTypeCount}종`} />
        <Stat label="모종" value={`${summary.totalQuantity}포기`} />
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-bold">필요 준비물</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          흙 {formatLiters(summary.totalSoilLiters)} · 모종 {summary.totalQuantity}개
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {summary.containers.map((container) => (
          <ContainerSummaryCard container={container} key={container.space.id} />
        ))}
      </div>

      <section
        className="rounded-3xl bg-[#0f513f] p-6 text-white shadow-[var(--shadow-md)] sm:flex sm:items-center sm:justify-between sm:gap-6"
        aria-labelledby="placement-summary-cta-title"
      >
        <div>
          <p className="text-sm font-bold text-[#ffd26f]">이 배치로 시작할까요?</p>
          <h2 className="mt-2 text-2xl font-bold" id="placement-summary-cta-title">
            배치를 수정하거나 이 계획으로 재배를 시작할 수 있어요
          </h2>
        </div>
        <div className="mt-5 flex shrink-0 gap-3 sm:mt-0">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3.5 font-bold text-white transition hover:bg-white/10"
            href={`/seasons/${seasonId}/placements`}
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

function ContainerSummaryCard({ container }: { container: ContainerSummary }) {
  const { space } = container;

  return (
    <section className="surface-panel p-6">
      <p className="font-bold">{space.name}</p>
      <p className="text-xs text-muted">
        {isGrowingSpaceType(space.type) ? GROWING_SPACE_LABELS[space.type] : space.type} · {space.widthCm}×{space.lengthCm}cm
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {container.items.map((item) => (
          <li className="flex items-center justify-between rounded-2xl border border-black/10 p-3 text-sm" key={item.cropId}>
            <span className="font-bold">{item.cropName}</span>
            <span className="text-muted">{item.quantity}포기 · 권장 간격 {item.plantSpacingCm}cm</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted">필요한 흙</dt>
          <dd className="font-bold">{formatLiters(container.soilLiters)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">햇빛</dt>
          <dd><FitBadge fit={container.sunlightFit} /></dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">화분 깊이</dt>
          <dd><FitBadge fit={container.depthFit} /></dd>
        </div>
      </dl>
    </section>
  );
}

function FitBadge({ fit }: { fit: FitLevel }) {
  if (fit === "unknown") return <span className="font-bold text-muted">확인 필요</span>;
  if (fit === "insufficient") return <span className="font-bold text-[var(--color-danger)]">부족할 수 있어요</span>;
  return <span className="font-bold text-leaf">적합</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
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
