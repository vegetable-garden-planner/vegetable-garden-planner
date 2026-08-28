"use client";

import { useState } from "react";
import type { SunlightExposure } from "@/shared/domain/growing-environment";
import {
  findPlanter,
  growthDensity,
  occupancy,
  placementsOf,
} from "@/features/placement-studio/domain/studio-model";
import { SUN_LABELS } from "@/features/placement-studio/domain/validation";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "../placement-studio.module.css";

interface Draft { name: string; w: string; h: string; d: string; location: string; sun: string }

/** 화분 정보. 여기서 고친 값은 실제 /spaces API 로 저장된다. */
export function PlanterInspector({ studio, id }: { studio: StudioController; id: string }) {
  const planter = findPlanter(studio.state, id);
  const [draft, setDraft] = useState<{ id: string; value: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!planter) return null;

  const value: Draft = draft && draft.id === id ? draft.value : {
    name: planter.name,
    w: String(planter.w),
    h: String(planter.h),
    d: planter.d === null ? "" : String(planter.d),
    location: planter.location,
    sun: planter.sun,
  };

  function set(patch: Partial<Draft>) {
    setDraft({ id, value: { ...value, ...patch } });
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await studio.actions.editPlanter(id, {
        name: value.name,
        widthCm: Number(value.w) || planter!.w,
        lengthCm: Number(value.h) || planter!.h,
        depthCm: value.d === "" ? null : Number(value.d),
        address: value.location,
        sunlight: (value.sun || null) as SunlightExposure | null,
        type: planter!.spaceType,
      });
      setDraft(null);
      studio.notify("화분 정보를 저장했습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "화분 정보를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`${planter!.name}을(를) 삭제할까요? 이 화분에 놓인 작물도 함께 사라집니다.`)) return;
    setBusy(true);
    setError(null);
    try {
      await studio.actions.removePlanter(id);
      studio.select(null, null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "화분을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const counts = new Map<string, number>();
  for (const placement of placementsOf(studio.state, id)) {
    const name = studio.context?.cropsById.get(placement.cropId)?.name ?? placement.cropId;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const density = growthDensity(studio.state, planter, studio.context?.cropsById ?? new Map());

  return (
    <>
      <div className={styles.inspectorHead}>
        <h3>{planter.name}</h3>
        <span className={styles.groupCount}>{planter.cols}×{planter.rows}칸</span>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.insSection}>
        <h4>기본 정보</h4>
        <div className={styles.label}>화분 이름</div>
        <input className={styles.field} onChange={(event) => set({ name: event.target.value })} value={value.name} />

        <div className={styles.label}>크기 (가로×세로×깊이)</div>
        <div className={styles.row3}>
          <input aria-label="가로" className={styles.field} inputMode="numeric" onChange={(event) => set({ w: event.target.value })} value={value.w} />
          <span>×</span>
          <input aria-label="세로" className={styles.field} inputMode="numeric" onChange={(event) => set({ h: event.target.value })} value={value.h} />
          <span>×</span>
          <input aria-label="깊이" className={styles.field} inputMode="numeric" onChange={(event) => set({ d: event.target.value })} value={value.d} />
          <span>cm</span>
        </div>

        <div className={styles.label}>위치</div>
        <input className={styles.field} onChange={(event) => set({ location: event.target.value })} value={value.location} />

        <div className={styles.label}>햇빛</div>
        <select className={styles.field} onChange={(event) => set({ sun: event.target.value })} value={value.sun}>
          <option value="">모름</option>
          <option value="full">햇빛 잘 듦 ({SUN_LABELS.full})</option>
          <option value="partial">반나절 ({SUN_LABELS.partial})</option>
          <option value="low">그늘 ({SUN_LABELS.low})</option>
        </select>
        <div className={styles.ruleNote}>
          크기를 바꾸면 격자 칸 수도 함께 바뀝니다. 캔버스에서는 화분을 늘리거나 줄이지 않습니다.
        </div>
      </div>

      <div className={styles.insSection}>
        <h4>공간 상태</h4>
        <div className={styles.spaceStats}>
          <div className={styles.spaceStat}><small>격자 점유</small><strong>{occupancy(studio.state, planter)}%</strong></div>
          <div className={styles.spaceStat}><small>예상 생육 공간</small><strong>{density}%</strong></div>
        </div>
        {density > 100 && (
          <div className={styles.explainBox}>
            지금 빈 칸이 보여도 다 자란 뒤에는 작물이 차지하는 공간이 서로 겹칠 수 있습니다.
          </div>
        )}
      </div>

      <div className={styles.insSection}>
        <h4>현재 작물</h4>
        {counts.size === 0 && <div className={styles.muted}>비어 있음</div>}
        {[...counts].map(([name, count]) => (
          <div className={styles.metric} key={name}><span>{name}</span><b>{count}</b></div>
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.btn} disabled={busy} onClick={() => void save()} type="button">정보 수정</button>
        <button className={styles.dangerBtn} disabled={busy} onClick={() => void remove()} type="button">삭제</button>
      </div>
    </>
  );
}
