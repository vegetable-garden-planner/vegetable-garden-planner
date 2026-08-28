"use client";

import { BrandMark } from "@/components/brand-mark";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "./placement-studio.module.css";

/** 상단 바: 브랜드 · 계획 이름 · 되돌리기 · 저장 상태 · 저장 */
export function StudioTopbar({ studio, onLeave }: { studio: StudioController; onLeave: () => void }) {
  const { store } = studio;
  const saving = store.saveState === "saving";

  return (
    <header className={styles.topbar}>
      <button aria-label="뒤로가기" className={styles.mobileBack} onClick={onLeave} type="button">←</button>

      <button className={styles.brandLink} onClick={onLeave} type="button">
        <BrandMark size={26} />
        <span className={styles.brand}>심어봄</span>
      </button>
      <div className={styles.divider} />

      <div className={styles.project}>
        내 재배 공간
        <span className={styles.projectSub}>화분 {studio.state.planters.length}개</span>
      </div>

      {/* 계획 필터. 기본은 전체 — 모든 계획의 화분이 한 캔버스에 함께 보인다. */}
      <select
        aria-label="재배 계획 필터"
        className={styles.planFilter}
        onChange={(event) => studio.setPlanFilter(event.target.value)}
        value={studio.planFilter}
      >
        <option value="all">전체 ({studio.allState.planters.length}개 화분)</option>
        {(studio.context?.plans ?? []).map((plan) => (
          <option key={plan.id} value={plan.id}>{plan.name} ({plan.planterCount})</option>
        ))}
      </select>

      <div className={styles.topActions}>
        <button
          aria-label="되돌리기"
          className={styles.iconBtn}
          disabled={!store.canUndo}
          onClick={store.undo}
          type="button"
        >
          ↶
        </button>
        <button
          aria-label="다시 실행"
          className={styles.iconBtn}
          disabled={!store.canRedo}
          onClick={store.redo}
          type="button"
        >
          ↷
        </button>
      </div>

      <div className={styles.statusWrap}>
        <div className={`${styles.status} ${store.dirty ? "" : styles.statusSaved}`}>
          {store.dirty ? <span className={styles.dot} /> : <span>✓</span>}
          <span>{saveLabel(store.dirty, store.saveState)}</span>
        </div>
        <button
          className={`${styles.btn} ${styles.primary}`}
          disabled={saving}
          onClick={() => void store.save()}
          type="button"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </header>
  );
}

function saveLabel(dirty: boolean, state: string): string {
  if (state === "saving") return "저장하는 중";
  if (state === "error") return "저장하지 못했습니다";
  if (dirty) return "저장하지 않은 변경사항";
  return "서버에 저장됨";
}
