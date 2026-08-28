"use client";

import { useState } from "react";
import { InlineConfirm } from "@/components/inline-confirm";
import type { WateringHistory, WateringLog } from "../domain/watering";
import styles from "./watering.module.css";

export type WateringHistoryState =
  | { status: "closed" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; history: WateringHistory };

export function WateringHistoryPanel({
  disabled,
  onReopen,
  state,
}: {
  disabled: boolean;
  onReopen: (log: WateringLog) => Promise<void>;
  state: WateringHistoryState;
}) {
  if (state.status === "closed") return null;
  if (state.status === "loading") {
    return <p className={styles.historyLoading}>물주기 이력을 불러오고 있습니다.</p>;
  }
  if (state.status === "error") {
    return <p className={styles.historyError} role="alert">{state.message}</p>;
  }

  return <WateringHistoryReady disabled={disabled} history={state.history} onReopen={onReopen} />;
}

function WateringHistoryReady({
  disabled,
  history,
  onReopen,
}: {
  disabled: boolean;
  history: WateringHistory;
  onReopen: (log: WateringLog) => Promise<void>;
}) {
  const [confirmingReopen, setConfirmingReopen] = useState(false);
  const { logs, snoozes } = history;
  return (
    <section className={styles.historyPanel} aria-label="물주기 변경 이력">
      <div className={styles.historyHeading}><p>관리 이력</p><h4>완료와 미루기 기록</h4></div>
      <h5>완료 이력 <span>{logs.length}건</span></h5>
      {logs.length === 0 ? (
        <p className={styles.historyEmpty}>아직 완료 기록이 없습니다.</p>
      ) : (
        <ol className={styles.historyList}>
          {logs.map((log, index) => (
            <li key={log.id}>
              <div>
                <time dateTime={log.wateredAt}>{formatDateTime(log.wateredAt)}</time>
                {index === 0 && !confirmingReopen && (
                  <button
                    disabled={disabled}
                    onClick={() => setConfirmingReopen(true)}
                    type="button"
                  >
                    최신 완료 취소
                  </button>
                )}
              </div>
              <p>
                {log.amountMl === null ? "물의 양 미입력" : `${log.amountMl.toLocaleString("ko-KR")}ml`}
                {log.memo ? ` · ${log.memo}` : ""}
              </p>
              {index === 0 && confirmingReopen && (
                <InlineConfirm
                  confirmLabel="완료 취소하기"
                  description="이전 예정 시각으로 되돌립니다."
                  disabled={disabled}
                  onCancel={() => setConfirmingReopen(false)}
                  onConfirm={() => { void onReopen(log).then(() => setConfirmingReopen(false)); }}
                  title="가장 최근 완료를 취소할까요?"
                />
              )}
            </li>
          ))}
        </ol>
      )}

      <h5>미루기 이력 <span>{snoozes.length}건</span></h5>
      {snoozes.length === 0 ? (
        <p className={styles.historyEmpty}>아직 미룬 기록이 없습니다.</p>
      ) : (
        <ol className={styles.historyList}>
          {snoozes.map((snooze) => (
            <li className={styles.snoozeHistoryItem} key={snooze.id}>
              <span>{formatDateTime(snooze.originalAt)}</span><b aria-hidden="true">→</b><strong>{formatDateTime(snooze.snoozedUntil)}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "잘못된 시각";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
