"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { InlineConfirm } from "@/components/inline-confirm";
import { SpaceMemoPanel } from "@/features/space-memo/components/space-memo-panel";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { deleteGrowingSpace } from "@/features/growing-space/infrastructure/space-api";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import { ApiError } from "@/shared/infrastructure/api-client";
import styles from "@/features/growing-space/components/growing-space.module.css";

const TYPE_LABELS: Record<GrowingSpace["type"], string> = {
  indoor: "실내 화분",
  balcony: "베란다",
  garden: "마당·텃밭",
};

const SUNLIGHT_LABELS: Record<NonNullable<GrowingSpace["sunlight"]>, string> = {
  low: "2시간 미만",
  partial: "2~5시간",
  full: "6시간 이상",
};

const SPACE_DELETE_BLOCKERS: Record<string, { label: string; href: (spaceId: string) => string }> = {
  SPACE_HAS_SEASONS: { label: "재배 계획에서 정리하기 →", href: (id) => `/seasons?spaceId=${encodeURIComponent(id)}` },
  SPACE_HAS_CONTAINER_PLACEMENTS: { label: "재배 계획에서 화분 배치 정리하기 →", href: (id) => `/seasons?spaceId=${encodeURIComponent(id)}` },
  SPACE_HAS_MEMOS: { label: "대시보드에서 메모 정리하기 →", href: () => "/dashboard" },
};

export function SpaceList() {
  const spacesState = useGrowingSpaces();
  const seasonsState = useGrowingSeasons();
  const [actionError, setActionError] = useState("");
  const [actionErrorCode, setActionErrorCode] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [busy, setBusy] = useState(false);
  const isRunningRef = useRef(false);

  if (spacesState.status === "error") return <ErrorMessage message={spacesState.message} onRetry={() => void spacesState.reload()} />;
  if (seasonsState.status === "error") return <ErrorMessage message={seasonsState.message} onRetry={() => void seasonsState.reload()} />;
  if (spacesState.status === "loading" || seasonsState.status === "loading") return <SpaceListLoading />;

  const { spaces } = spacesState;
  if (spaces.length === 0) return <EmptySpaceList />;
  const activeSpaceCount = new Set(seasonsState.seasons.map((season) => season.spaceId)).size;
  const gardenCount = spaces.filter((space) => space.type === "garden").length;

  async function removeSpace(space: GrowingSpace) {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    setActionError("");
    setActionErrorCode("");
    setBusy(true);
    try {
      await deleteGrowingSpace(space);
      setDeletingId("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "공간을 삭제하지 못했습니다.");
      setActionErrorCode(error instanceof ApiError ? error.code : "");
    } finally {
      setBusy(false);
      isRunningRef.current = false;
    }
  }

  return (
    <div className={styles.listPage}>
      <section className={styles.listOverview} aria-label="재배 공간 현황">
        <div>
          <p>등록된 환경</p>
          <h2>{spaces.length}개의 공간을 관리하고 있어요</h2>
          <span>공간마다 햇빛과 크기를 기록해 두면 다음 재배의 작물 선택이 더 정확해집니다.</span>
        </div>
        <dl>
          <SpaceStat label="전체 공간" value={`${spaces.length}개`} />
          <SpaceStat label="재배 계획" value={`${activeSpaceCount}개`} />
          <SpaceStat label="마당·텃밭" value={`${gardenCount}개`} />
        </dl>
      </section>
      {actionError && (
        <ErrorMessage
          action={SPACE_DELETE_BLOCKERS[actionErrorCode] && deletingId
            ? { href: SPACE_DELETE_BLOCKERS[actionErrorCode].href(deletingId), label: SPACE_DELETE_BLOCKERS[actionErrorCode].label }
            : undefined}
          message={actionError}
        />
      )}
      <div className={styles.listHeading}>
        <div><p>나의 재배 기반</p><h2>공간별 환경</h2></div>
        <Link href="/spaces/new">새 공간 등록하기 →</Link>
      </div>
      <ul className={styles.spaceGrid}>
        {spaces.map((space) => {
          const seasonCount = seasonsState.seasons.filter(
            (season) => season.spaceId === space.id,
          ).length;
          return (
            <li className={styles.spaceCard} data-space-type={space.type} key={space.id}>
              <div className={styles.cardTopline} aria-hidden="true" />
              <div className={styles.cardHeader}>
                <div><p>{TYPE_LABELS[space.type]}</p><h3>{space.name}</h3></div>
                <span>{space.type === "garden" ? "격자형" : "화분 배치형"}</span>
              </div>
              <dl className={styles.cardFacts}>
                <div><dt>공간 크기</dt><dd>{space.widthCm} × {space.lengthCm}{space.depthCm !== null ? ` × ${space.depthCm}` : ""}cm</dd></div>
                <div><dt>예상 햇빛</dt><dd>{space.estimatedSunlightHours !== null ? `하루 약 ${space.estimatedSunlightHours}시간` : space.sunlight === null ? "모름" : SUNLIGHT_LABELS[space.sunlight]}</dd></div>
                <div><dt>재배 계획</dt><dd>{seasonCount}개</dd></div>
              </dl>
              {deletingId === space.id ? (
                <InlineConfirm
                  description="삭제하면 되돌릴 수 없습니다."
                  disabled={busy}
                  onCancel={() => setDeletingId("")}
                  onConfirm={() => void removeSpace(space)}
                  title={`'${space.name}' 공간을 삭제할까요?`}
                />
              ) : (
                <div className={styles.cardActions}>
                  <Link className={styles.cardPrimaryLink} href={`/seasons?spaceId=${encodeURIComponent(space.id)}`}>재배 계획 보기 <span>→</span></Link>
                  <Link href={`/spaces/${space.id}/edit`}>수정</Link>
                  <button onClick={() => setDeletingId(space.id)} type="button">삭제</button>
                </div>
              )}
              <Link className={styles.addSeasonLink} href={`/seasons/new?spaceId=${space.id}`}>이 화분으로 새 재배 시작하기</Link>
              {/* 메모는 공간(spaceId)에 붙는 정보라 이 화면이 제자리다. 홈에는 요약만 보여 준다. */}
              <SpaceMemoPanel spaceId={space.id} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptySpaceList() {
  return (
    <section className={styles.emptyState}>
      <span aria-hidden="true">01</span>
      <p>재배를 시작하는 첫 단계</p>
      <h2>아직 등록한 공간이 없어요</h2>
      <strong>거실 창가나 작은 화분 자리도 충분합니다. 먼저 식물이 자랄 환경을 알려주세요.</strong>
      <Link href="/spaces/new">첫 공간 등록하기 →</Link>
    </section>
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

function SpaceStat({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function SpaceListLoading() {
  return (
    <div className={styles.loading} aria-live="polite" aria-label="재배 공간을 불러오는 중">
      <div /><div /><div />
    </div>
  );
}
