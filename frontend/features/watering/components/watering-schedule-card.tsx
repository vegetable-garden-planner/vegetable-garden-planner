"use client";

import { useState } from "react";
import type { CropReference } from "../../crop-catalog/domain/crop-reference";
import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season";
import {
  getWateringScheduleStatus,
  type CompleteWateringInput,
  type WateringLog,
  type WateringSchedule,
  type WateringScheduleUpdate,
} from "../domain/watering";
import { WateringCompleteForm, WateringSnoozeForm } from "./watering-action-forms";
import {
  formatDateTime,
  WateringHistoryPanel,
  type WateringHistoryState,
} from "./watering-history";
import styles from "./watering.module.css";

const STATUS_LABELS = {
  disabled: "비활성",
  overdue: "기한 지남",
  today: "오늘 예정",
  upcoming: "예정",
} as const;

export function WateringScheduleCard({
  crop,
  disabled,
  historyState,
  onCloseHistory,
  onComplete,
  onDelete,
  onLoadHistory,
  onReopen,
  onSnooze,
  onUpdate,
  schedule,
  season,
}: {
  crop: CropReference | undefined;
  disabled: boolean;
  historyState: WateringHistoryState;
  onCloseHistory: () => void;
  onComplete: (input: CompleteWateringInput) => Promise<boolean>;
  onDelete: () => Promise<void>;
  onLoadHistory: () => Promise<void>;
  onReopen: (log: WateringLog) => Promise<void>;
  onSnooze: (snoozedUntil: string) => Promise<boolean>;
  onUpdate: (update: WateringScheduleUpdate) => Promise<boolean>;
  schedule: WateringSchedule;
  season: PersistedGrowingSeason;
}) {
  const [intervalDays, setIntervalDays] = useState(String(schedule.intervalDays));
  const [openAction, setOpenAction] = useState<"complete" | "snooze" | null>(null);
  const [intervalError, setIntervalError] = useState("");
  const status = getWateringScheduleStatus(schedule, new Date());

  async function saveInterval() {
    const interval = Number(intervalDays);
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) {
      setIntervalError("1일 이상 365일 이하로 입력해 주세요.");
      return;
    }
    setIntervalError("");
    if (interval !== schedule.intervalDays) await onUpdate({ intervalDays: interval });
  }

  async function complete(input: CompleteWateringInput): Promise<boolean> {
    const completed = await onComplete(input);
    if (completed) setOpenAction(null);
    return completed;
  }

  async function snooze(snoozedUntil: string): Promise<boolean> {
    const snoozed = await onSnooze(snoozedUntil);
    if (snoozed) setOpenAction(null);
    return snoozed;
  }

  return (
    <li className={styles.scheduleCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cropIdentity}>
          <span aria-hidden="true">{(crop?.name ?? schedule.cropId).slice(0, 1)}</span>
          <div>
            <p>{crop?.familyName ?? "작물 정보 확인 필요"}</p>
            <h3>{crop?.name ?? schedule.cropId}</h3>
          </div>
        </div>
        <span className={styles.statusChip} data-status={status}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className={styles.nextWatering}>
        <p>다음 물주기</p>
        <time dateTime={schedule.nextWateringAt}>{formatDateTime(schedule.nextWateringAt)}</time>
        <span>{schedule.enabled ? `${schedule.intervalDays}일마다 반복` : "현재 반복 알림을 쉬고 있어요"}</span>
      </div>

      <div className={styles.scheduleSettings}>
        <label>
          <span>반복 간격</span>
          <span className={styles.compactInput}>
            <input
              aria-label={`${crop?.name ?? schedule.cropId} 반복 간격`}
              disabled={disabled}
              max="365"
              min="1"
              onChange={(event) => setIntervalDays(event.target.value)}
              type="number"
              value={intervalDays}
            />
            일
          </span>
        </label>
        <button className={styles.outlineButton} disabled={disabled} onClick={() => { void saveInterval(); }} type="button">
          간격 저장
        </button>
        <button className={styles.softButton} disabled={disabled} onClick={() => { void onUpdate({ enabled: !schedule.enabled }); }} type="button">
          {schedule.enabled ? "일정 끄기" : "일정 켜기"}
        </button>
      </div>
      {intervalError && <p className={styles.inlineError} role="alert">{intervalError}</p>}

      {schedule.enabled && (
        <div className={styles.primaryActions}>
          <button className={styles.primaryButton} disabled={disabled} onClick={() => setOpenAction(openAction === "complete" ? null : "complete")} type="button">
            물주기 완료
          </button>
          <button className={styles.snoozeButton} disabled={disabled} onClick={() => setOpenAction(openAction === "snooze" ? null : "snooze")} type="button">
            이번 일정 미루기
          </button>
        </div>
      )}

      {schedule.enabled && openAction === "complete" && <WateringCompleteForm disabled={disabled} onComplete={complete} season={season} />}
      {schedule.enabled && openAction === "snooze" && <WateringSnoozeForm disabled={disabled} onSnooze={snooze} schedule={schedule} season={season} />}

      <div className={styles.cardFooter}>
        {historyState.status === "closed" ? (
          <button disabled={disabled} onClick={() => { void onLoadHistory(); }} type="button">완료·미루기 이력 보기</button>
        ) : (
          <span>
            <button disabled={disabled || historyState.status === "loading"} onClick={() => { void onLoadHistory(); }} type="button">이력 새로고침</button>
            <button disabled={disabled} onClick={onCloseHistory} type="button">이력 닫기</button>
          </span>
        )}
        <button className={styles.deleteButton} disabled={disabled} onClick={() => { void onDelete(); }} type="button">
          일정 삭제
        </button>
      </div>
      <WateringHistoryPanel disabled={disabled} onReopen={onReopen} state={historyState} />
    </li>
  );
}
