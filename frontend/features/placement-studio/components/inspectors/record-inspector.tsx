"use client";

import { useState } from "react";
import {
  CULTIVATION_RECORD_TYPES,
  CULTIVATION_RECORD_TYPE_LABELS,
  createRecordDraft,
  validateCultivationRecordDraft,
  type CultivationRecordDraft,
} from "@/features/cultivation-record/domain/cultivation-record";
import {
  deleteCultivationRecord,
  updateCultivationRecord,
} from "@/features/cultivation-record/infrastructure/cultivation-record-api";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "../placement-studio.module.css";

/** 재배 기록 하나. 실제 /records API 로 수정·삭제한다. */
export function RecordInspector({ studio, id }: { studio: StudioController; id: string }) {
  const records = studio.records.status === "ready" ? studio.records.records : [];
  const record = records.find((item) => item.id === id);
  const season = studio.context?.seasons.find((item) => item.id === studio.recordPlanId);
  const [draft, setDraft] = useState<{ id: string; value: CultivationRecordDraft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!record || !season) return null;
  const value = draft && draft.id === id ? draft.value : createRecordDraft(season, record);

  async function save() {
    const result = validateCultivationRecordDraft(value, season!);
    if (!result.valid) {
      setError(Object.values(result.errors)[0] ?? "입력을 확인해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateCultivationRecord(record!, result.value);
      await studio.records.reload();
      setDraft(null);
      studio.notify("기록을 수정했습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "기록을 수정하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await deleteCultivationRecord(record!);
      await studio.records.reload();
      studio.select(null, null);
      studio.notify("기록을 삭제했습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "기록을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.inspectorHead}>
        <h3>재배 기록</h3>
        <span className={styles.stateBadge}>{CULTIVATION_RECORD_TYPE_LABELS[record.type]}</span>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.insSection}>
        <div className={styles.label}>기록 유형</div>
        <div className={styles.quickChips}>
          {CULTIVATION_RECORD_TYPES.map((type) => (
            <button
              className={`${styles.quickChip} ${value.type === type ? styles.quickChipActive : ""}`}
              key={type}
              onClick={() => setDraft({ id, value: { ...value, type } })}
              type="button"
            >
              {CULTIVATION_RECORD_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <div className={styles.label}>기록 시각</div>
        <input
          className={styles.field}
          onChange={(event) => setDraft({ id, value: { ...value, occurredAtLocal: event.target.value } })}
          type="datetime-local"
          value={value.occurredAtLocal}
        />

        <div className={styles.label}>상세 내용</div>
        <textarea
          className={styles.field}
          onChange={(event) => setDraft({ id, value: { ...value, notes: event.target.value } })}
          value={value.notes}
        />

        <div className={styles.label}>수량 · 단위 (함께 입력)</div>
        <div className={styles.row3}>
          <input
            aria-label="수량"
            className={styles.field}
            inputMode="decimal"
            onChange={(event) => setDraft({ id, value: { ...value, quantity: event.target.value } })}
            value={value.quantity}
          />
          <span />
          <input
            aria-label="단위"
            className={styles.field}
            onChange={(event) => setDraft({ id, value: { ...value, unit: event.target.value } })}
            value={value.unit}
          />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.btn} disabled={busy} onClick={() => void save()} type="button">수정</button>
        <button className={styles.dangerBtn} disabled={busy} onClick={() => void remove()} type="button">삭제</button>
      </div>
    </>
  );
}
