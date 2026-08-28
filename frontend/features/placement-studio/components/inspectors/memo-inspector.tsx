"use client";

import { useState } from "react";
import { validateSpaceMemoBody } from "@/features/space-memo/domain/space-memo";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "../placement-studio.module.css";

/** 화분 메모 하나. 수정·삭제 모두 실제 API 로 나간다. */
export function MemoInspector({ studio, id }: { studio: StudioController; id: string }) {
  const memo = studio.memos.memos.find((item) => item.id === id);
  const [draft, setDraft] = useState<{ id: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!memo) return null;
  const body = draft && draft.id === id ? draft.body : memo.body;
  const planter = studio.state.planters.find((item) => item.id === memo.spaceId);

  async function save() {
    const message = validateSpaceMemoBody(body);
    if (message) { setError(message); return; }
    setBusy(true);
    setError(null);
    try {
      await studio.memos.edit(memo!, body.trim(), memo!.cropId);
      setDraft(null);
      studio.notify("메모를 수정했습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "메모를 수정하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await studio.memos.remove(memo!);
      studio.select(null, null);
      studio.notify("메모를 삭제했습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "메모를 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.inspectorHead}><h3>화분 메모</h3></div>
      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.insSection}>
        <div className={styles.linkedTarget}>
          붙어 있는 화분<br /><b>{planter?.name ?? "화분"}</b>
          {memo.cropId && <><br />연결 작물 · {studio.context?.cropsById.get(memo.cropId)?.name ?? memo.cropId}</>}
        </div>

        <div className={styles.label}>내용</div>
        <textarea
          className={styles.field}
          onChange={(event) => setDraft({ id, body: event.target.value })}
          value={body}
        />

        <div className={styles.label}>기록일</div>
        <div className={styles.muted}>{memo.updatedAt.slice(0, 10)}</div>
      </div>

      <div className={styles.actions}>
        <button className={styles.btn} disabled={busy} onClick={() => void save()} type="button">수정</button>
        <button className={styles.dangerBtn} disabled={busy} onClick={() => void remove()} type="button">삭제</button>
      </div>
    </>
  );
}
