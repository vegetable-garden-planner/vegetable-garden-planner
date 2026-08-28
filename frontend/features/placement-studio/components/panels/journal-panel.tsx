"use client";

import { useState } from "react";
import {
  CULTIVATION_RECORD_TYPES,
  CULTIVATION_RECORD_TYPE_LABELS,
  createRecordDraft,
  validateCultivationRecordDraft,
  type CultivationRecordDraft,
} from "@/features/cultivation-record/domain/cultivation-record";
import { createCultivationRecord } from "@/features/cultivation-record/infrastructure/cultivation-record-api";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "../placement-studio.module.css";

/**
 * 재배 기록
 *
 * 실제 API(/seasons/{id}/records)를 그대로 쓴다.
 * 서버가 가진 항목만 입력받는다. 대상 화분·조치·해결 상태 같은
 * 저장할 자리가 없는 항목은 만들어 넣지 않는다.
 */
export function JournalPanel({ studio }: { studio: StudioController }) {
  // 재배 기록은 계획에 종속된 데이터다. 어느 계획의 기록인지 분명히 한다.
  const season = studio.context?.seasons.find((item) => item.id === studio.recordPlanId);
  const [draft, setDraft] = useState<CultivationRecordDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!season) return <div className={styles.muted}>재배 계획을 불러오는 중입니다.</div>;
  const value = draft ?? createRecordDraft(season);

  async function submit() {
    if (!season) return;
    const result = validateCultivationRecordDraft(value, season);
    if (!result.valid) {
      setError(Object.values(result.errors)[0] ?? "입력을 확인해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createCultivationRecord(season.id, result.value);
      await studio.records.reload();
      setDraft(createRecordDraft(season));
      studio.notify("재배 기록을 남겼습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "기록을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const records = studio.records.status === "ready" ? studio.records.records : [];

  return (
    <>
      <h2 className={styles.panelTitle}>재배 기록</h2>
      <div className={styles.linkedTarget}>
        <b>{season.name}</b>의 기록입니다. 다른 계획의 기록을 보려면 위쪽 계획 필터를 바꾸세요.
      </div>
      <div className={styles.muted}>
        문제를 한 번 표시하고 끝내는 기능이 아니라, 실제로 있었던 일을 계속 기록합니다.
        저장 버튼과 상관없이 바로 서버에 남습니다.
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.sectionTitle}>무슨 일이 있었나요?</div>
      <div className={styles.quickChips}>
        {CULTIVATION_RECORD_TYPES.map((type) => (
          <button
            className={`${styles.quickChip} ${value.type === type ? styles.quickChipActive : ""}`}
            key={type}
            onClick={() => setDraft({ ...value, type })}
            type="button"
          >
            {CULTIVATION_RECORD_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div className={styles.label}>기록 시각</div>
      <input
        className={styles.field}
        onChange={(event) => setDraft({ ...value, occurredAtLocal: event.target.value })}
        type="datetime-local"
        value={value.occurredAtLocal}
      />

      <div className={styles.label}>상세 내용</div>
      <textarea
        className={styles.field}
        onChange={(event) => setDraft({ ...value, notes: event.target.value })}
        placeholder="예) 어제 하루 물을 못 줬고 오늘 아침 잎이 조금 처져 보였어요."
        value={value.notes}
      />

      <div className={styles.label}>수량 · 단위 (선택, 함께 입력)</div>
      <div className={styles.row3}>
        <input
          aria-label="수량"
          className={styles.field}
          inputMode="decimal"
          onChange={(event) => setDraft({ ...value, quantity: event.target.value })}
          value={value.quantity}
        />
        <span />
        <input
          aria-label="단위"
          className={styles.field}
          onChange={(event) => setDraft({ ...value, unit: event.target.value })}
          placeholder="개 · g"
          value={value.unit}
        />
        <span />
        <span />
        <span />
      </div>

      <button className={styles.full} disabled={busy} onClick={() => void submit()} type="button">
        {busy ? "저장하는 중…" : "＋ 기록 남기기"}
      </button>

      <div className={styles.sectionTitle}>최근 기록 ({records.length})</div>
      {studio.records.status === "error" && <div className={styles.errorBox}>{studio.records.message}</div>}
      {records.length === 0 && <div className={styles.muted}>아직 기록이 없습니다.</div>}

      <div className={styles.journalList}>
        {[...records].reverse().map((record) => (
          <button
            className={styles.journalItem}
            key={record.id}
            onClick={() => studio.select("journal", record.id)}
            type="button"
          >
            <div className={styles.journalMeta}>
              <strong>{CULTIVATION_RECORD_TYPE_LABELS[record.type]}</strong>
              <small>{record.occurredAt.slice(0, 10)}</small>
            </div>
            <p>{record.notes || "내용 없음"}</p>
          </button>
        ))}
      </div>

      <div className={styles.groupMemberHint}>
        현재 재배 기록 API 에는 대상 화분·조치 내용·해결 상태 항목이 없습니다.
        화분별 메모가 필요하면 메모 도구를 사용하세요.
      </div>
    </>
  );
}
