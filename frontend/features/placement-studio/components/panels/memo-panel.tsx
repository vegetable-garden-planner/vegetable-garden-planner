"use client";

import { useState } from "react";
import { validateSpaceMemoBody } from "@/features/space-memo/domain/space-memo";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import { placementsOf } from "@/features/placement-studio/domain/studio-model";
import styles from "../placement-studio.module.css";

/**
 * 화분 메모
 *
 * 실제 API(/spaces/{id}/memos)를 그대로 쓴다.
 * 메모는 캔버스에 떠다니지 않고 화분 옆에 붙어 화분을 옮기면 따라온다.
 */
export function MemoPanel({ studio }: { studio: StudioController }) {
  const planters = studio.state.planters;
  const first = studio.selection.type === "planter" ? studio.selection.ids[0] : planters[0]?.id ?? "";
  const [planterId, setPlanterId] = useState(first);
  const [cropId, setCropId] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = planters.find((planter) => planter.id === planterId) ?? planters[0];
  const cropsInPlanter = target
    ? [...new Set(placementsOf(studio.state, target.id).map((placement) => placement.cropId))]
    : [];

  async function add() {
    const message = validateSpaceMemoBody(body);
    if (message) { setError(message); return; }
    setBusy(true);
    setError(null);
    try {
      await studio.memos.add(planterId || planters[0]?.id || "", body.trim(), cropId || null);
      setBody("");
      studio.notify("메모를 화분 옆에 붙였습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "메모를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className={styles.panelTitle}>화분 메모</h2>
      <div className={styles.muted}>
        메모는 특정 화분(원하면 그 안의 작물)에 붙습니다. 저장 버튼과 상관없이 바로 서버에 기록됩니다.
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {studio.memos.error && <div className={styles.errorBox}>{studio.memos.error}</div>}

      <div className={styles.sectionTitle}>메모 추가</div>
      <div className={styles.label}>붙일 화분</div>
      <select
        className={styles.field}
        onChange={(event) => { setPlanterId(event.target.value); setCropId(""); }}
        value={planterId}
      >
        {planters.map((planter) => <option key={planter.id} value={planter.id}>{planter.name}</option>)}
      </select>

      {cropsInPlanter.length > 0 && (
        <>
          <div className={styles.label}>연결할 작물 (선택)</div>
          <select className={styles.field} onChange={(event) => setCropId(event.target.value)} value={cropId}>
            <option value="">화분 전체</option>
            {cropsInPlanter.map((id) => (
              <option key={id} value={id}>{studio.context?.cropsById.get(id)?.name ?? id}</option>
            ))}
          </select>
        </>
      )}

      <div className={styles.label}>내용</div>
      <textarea
        className={styles.field}
        onChange={(event) => setBody(event.target.value)}
        placeholder="예) 오후 3시 이후에는 이쪽이 그늘져요."
        value={body}
      />

      <button className={styles.full} disabled={busy} onClick={() => void add()} type="button">
        {busy ? "저장하는 중…" : "＋ 메모 붙이기"}
      </button>

      <div className={styles.sectionTitle}>현재 메모 ({studio.memos.memos.length})</div>
      {studio.memos.memos.length === 0 && <div className={styles.muted}>메모가 없습니다.</div>}
      <div className={styles.journalList}>
        {studio.memos.memos.map((memo) => (
          <button
            className={styles.journalItem}
            key={memo.id}
            onClick={() => studio.select("note", memo.id)}
            type="button"
          >
            <div className={styles.journalMeta}>
              <strong>{planters.find((planter) => planter.id === memo.spaceId)?.name ?? "화분"}</strong>
              <small>{memo.updatedAt.slice(0, 10)}</small>
            </div>
            <p>{memo.body}</p>
          </button>
        ))}
      </div>
    </>
  );
}
