"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { InlineConfirm } from "@/components/inline-confirm";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import {
  type PersistedGrowingSeason,
  type GrowingSeasonStatus,
} from "@/features/growing-season/domain/growing-season";
import { getSeasonNextStep } from "@/features/growing-season/domain/season-next-step";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { deleteGrowingSeason } from "@/features/growing-season/infrastructure/season-api";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import { ApiError } from "@/shared/infrastructure/api-client";
import styles from "@/features/growing-season/components/growing-season.module.css";

const STATUS_LABELS: Record<GrowingSeasonStatus, string> = {
  planned: "예정",
  active: "진행 중",
  completed: "종료",
};

const SEASON_DELETE_BLOCKERS: Record<string, { label: string; href: (seasonId: string) => string }> = {
  SEASON_HAS_LAYOUT: { label: "격자 배치에서 정리하기 →", href: (id) => `/seasons/${id}/layout` },
  SEASON_HAS_TASKS: { label: "재배 일정에서 정리하기 →", href: (id) => `/seasons/${id}/tasks` },
  SEASON_HAS_RECORDS: { label: "재배 기록에서 정리하기 →", href: (id) => `/seasons/${id}/records` },
  SEASON_HAS_WATERING_SCHEDULES: { label: "물주기에서 정리하기 →", href: (id) => `/seasons/${id}/watering` },
  SEASON_HAS_CONTAINER_PLACEMENTS: { label: "화분 배치에서 정리하기 →", href: (id) => `/seasons/${id}/placements` },
};

export function SeasonList({ selectedSpaceId = "" }: { selectedSpaceId?: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const cropCatalog = useCropCatalog();
  const layoutsState = useGardenLayouts();
  const [actionError, setActionError] = useState("");
  const [actionErrorCode, setActionErrorCode] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [busy, setBusy] = useState(false);
  const isRunningRef = useRef(false);

  if (seasonsState.status === "error") return <ErrorMessage message={seasonsState.message} onRetry={() => void seasonsState.reload()} />;
  if (spacesState.status === "error") return <ErrorMessage message={spacesState.message} onRetry={() => void spacesState.reload()} />;
  if (cropCatalog.status === "error") return <ErrorMessage message={cropCatalog.message} onRetry={() => window.location.reload()} />;
  if (layoutsState.status === "error") return <ErrorMessage message={layoutsState.message} onRetry={() => void layoutsState.reload()} />;
  if (seasonsState.status === "loading" || spacesState.status === "loading" || cropCatalog.status === "loading" || layoutsState.status === "loading") return <SeasonListLoading />;
  const spacesById = new Map(spacesState.spaces.map((space) => [space.id, space]));
  const cropsById = new Map(cropCatalog.crops.map((crop) => [crop.id, crop]));
  const layoutsBySeasonId = new Map(
    layoutsState.layouts.map((layout) => [layout.seasonId, layout]),
  );
  const selectedSpace = selectedSpaceId ? spacesById.get(selectedSpaceId) : undefined;
  if (selectedSpaceId && !selectedSpace) {
    return <InvalidSpaceFilter />;
  }

  const visibleSeasons = selectedSpaceId
    ? seasonsState.seasons.filter((season) => season.spaceId === selectedSpaceId)
    : seasonsState.seasons;
  if (visibleSeasons.length === 0) {
    return <EmptySeasonList selectedSpaceId={selectedSpaceId} spaceName={selectedSpace?.name} />;
  }
  const activeCount = visibleSeasons.filter((season) => season.status === "active").length;
  const plannedCount = visibleSeasons.filter((season) => season.status === "planned").length;

  async function removeSeason(season: PersistedGrowingSeason) {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    setActionError("");
    setActionErrorCode("");
    setBusy(true);
    try {
      await deleteGrowingSeason(season);
      setDeletingId("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "재배 계획을 삭제하지 못했습니다.");
      setActionErrorCode(error instanceof ApiError ? error.code : "");
    } finally {
      setBusy(false);
      isRunningRef.current = false;
    }
  }

  return (
    <div className={styles.listPage}>
      <section className={styles.listOverview} aria-label="재배 계획 현황">
        <div><p>현재 계획</p><h2>{visibleSeasons.length}개의 재배 계획이 있어요</h2><span>기간과 공간을 기준으로 작물 배치부터 재배 일정과 기록까지 이어서 관리합니다.</span></div>
        <dl><SeasonStat label="전체 계획" value={`${visibleSeasons.length}개`} /><SeasonStat label="진행 중" value={`${activeCount}개`} /><SeasonStat label="예정" value={`${plannedCount}개`} /></dl>
      </section>
      {selectedSpace && (
        <div className={styles.filterNotice}>
          <p>‘{selectedSpace.name}’에서 키우는 계획만 보고 있어요.</p>
          <Link href="/seasons">전체 계획 보기 →</Link>
        </div>
      )}
      {actionError && (
        <ErrorMessage
          action={SEASON_DELETE_BLOCKERS[actionErrorCode] && deletingId
            ? { href: SEASON_DELETE_BLOCKERS[actionErrorCode].href(deletingId), label: SEASON_DELETE_BLOCKERS[actionErrorCode].label }
            : undefined}
          message={actionError}
        />
      )}
      <div className={styles.listHeading}><div><p>재배 흐름</p><h2>계획 목록</h2></div><Link href={selectedSpaceId ? `/seasons/new?spaceId=${encodeURIComponent(selectedSpaceId)}` : "/seasons/new"}>새 재배 시작 →</Link></div>
      <ul className={styles.seasonGrid}>
        {visibleSeasons.map((season) => {
          const status = season.status;
          const linkedSpace = spacesById.get(season.spaceId);
          const featuredCrop = season.featuredCropId
            ? cropsById.get(season.featuredCropId)
            : undefined;
          const nextStep = getSeasonNextStep(
            season,
            linkedSpace?.type ?? "garden",
            layoutsBySeasonId.get(season.id),
          );
          return (
            <li className={styles.seasonCard} key={season.id}>
              <div className={styles.cardHeader}>
                <div><p>{linkedSpace?.name ?? "연결된 공간을 찾을 수 없음"}</p><h3>{season.name}</h3></div>
                <span data-status={status}>{STATUS_LABELS[status]}</span>
              </div>
              <dl className={styles.cardFacts}>
                <div><dt>재배 기간</dt><dd>{season.startDate}<span>~</span>{season.endDate}</dd></div>
                <div><dt>배치 방식</dt><dd>{linkedSpace?.type === "garden" ? "격자 배치" : "화분별 배치"}</dd></div>
              </dl>
              {featuredCrop && <Link className={styles.cropLink} href={`/crops/${featuredCrop.id}`}>선택 식물 · {featuredCrop.name} →</Link>}
              {season.notes && <p className={styles.cardNotes}>{season.notes}</p>}
              <section className={styles.nextStep} aria-label={`${season.name} 다음 단계`}>
                <div><p>다음 추천 단계</p><h4>{nextStep.title}</h4><span>{nextStep.description}</span></div>
                <Link href={nextStep.href}>{nextStep.label} →</Link>
              </section>
              <div className={styles.cardLinks}>
                <Link href={linkedSpace?.type === "garden" ? `/seasons/${season.id}/layout` : `/seasons/${season.id}/placements`}>작물 배치</Link>
                <Link href={`/seasons/${season.id}/tasks`}>재배 일정</Link>
                <Link href={`/seasons/${season.id}/watering`}>물주기</Link>
                <Link href={`/seasons/${season.id}/records`}>재배 기록</Link>
              </div>
              {deletingId === season.id ? (
                <InlineConfirm
                  description="삭제하면 되돌릴 수 없습니다."
                  disabled={busy}
                  onCancel={() => setDeletingId("")}
                  onConfirm={() => void removeSeason(season)}
                  title={`'${season.name}' 계획을 삭제할까요?`}
                />
              ) : (
                <div className={styles.cardActions}>
                  <Link href={`/seasons/${season.id}/edit`}>계획 수정</Link>
                  <button onClick={() => setDeletingId(season.id)} type="button">삭제</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptySeasonList({
  selectedSpaceId = "",
  spaceName,
}: {
  selectedSpaceId?: string;
  spaceName?: string;
}) {
  const newSeasonHref = selectedSpaceId
    ? `/seasons/new?spaceId=${encodeURIComponent(selectedSpaceId)}`
    : "/seasons/new";
  return (
    <div className={styles.emptyState}>
      <span aria-hidden="true">02</span>
      <p>공간 다음에 이어지는 단계</p>
      <h2 className="text-xl font-bold">{spaceName ? `‘${spaceName}’에 만든 재배 계획이 없어요` : "아직 만든 재배 계획이 없어요"}</h2>
      <strong>재배 기간을 등록하면 식물 배치와 일정 관리의 기준이 됩니다.</strong>
      <div><Link href={newSeasonHref}>첫 재배 시작하기 →</Link>{selectedSpaceId && <Link href="/seasons">전체 계획 보기</Link>}</div>
    </div>
  );
}

function InvalidSpaceFilter() {
  return (
    <div className={styles.emptyState}>
      <h2 className="text-xl font-bold">선택한 공간을 찾을 수 없어요</h2>
      <strong>공간이 삭제되었거나 주소가 올바르지 않습니다.</strong>
      <div><Link href="/spaces">내 공간으로 돌아가기 →</Link></div>
    </div>
  );
}

function ErrorMessage({
  action,
  message,
  onRetry,
}: {
  action?: { href: string; label: string };
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.errorMessage} role="alert">
      <p>{message}</p>
      {action && <Link href={action.href}>{action.label}</Link>}
      {onRetry && <button onClick={onRetry} type="button">다시 시도</button>}
    </div>
  );
}

function SeasonStat({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function SeasonListLoading() {
  return <div className={styles.loading} aria-label="재배 계획을 불러오는 중" aria-live="polite"><div /><div /></div>;
}
