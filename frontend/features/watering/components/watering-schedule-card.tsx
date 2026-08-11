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

const STATUS_LABELS = {
  disabled: "비활성",
  overdue: "기한 지남",
  today: "오늘 예정",
  upcoming: "예정",
} as const;

const STATUS_STYLES = {
  disabled: "bg-stone-100 text-stone-600",
  overdue: "bg-red-50 text-red-700",
  today: "bg-amber-50 text-amber-800",
  upcoming: "bg-leaf-soft text-leaf-dark",
} as const;

export function WateringScheduleCard({
  crop,
  disabled,
  historyState,
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
  onComplete: (input: CompleteWateringInput) => Promise<boolean>;
  onDelete: () => Promise<void>;
  onLoadHistory: () => Promise<void>;
  onReopen: (log: WateringLog) => Promise<void>;
  onSnooze: (snoozedUntil: string) => Promise<void>;
  onUpdate: (update: WateringScheduleUpdate) => Promise<void>;
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

  return (
    <li className="surface-panel relative overflow-hidden p-5 transition hover:shadow-[var(--shadow-md)] sm:p-6">
      <span className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(var(--color-primary),var(--color-secondary))]" aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-leaf">{crop?.familyName ?? "작물 정보 확인 필요"}</p>
          <h2 className="mt-1 text-xl font-bold">{crop?.name ?? schedule.cropId}</h2>
          <p className="mt-2 text-sm text-muted">다음 물주기 · {formatDateTime(schedule.nextWateringAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-ink/10 pt-4">
        <label className="text-xs font-bold text-muted">
          반복 간격
          <span className="mt-1.5 flex items-center gap-2">
            <input
              className="w-20 rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink"
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
        <button className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold disabled:opacity-50" disabled={disabled} onClick={() => { void saveInterval(); }} type="button">
          간격 저장
        </button>
        <button className="rounded-full bg-leaf-soft px-4 py-2 text-xs font-bold text-leaf-dark disabled:opacity-50" disabled={disabled} onClick={() => { void onUpdate({ enabled: !schedule.enabled }); }} type="button">
          {schedule.enabled ? "일정 끄기" : "일정 켜기"}
        </button>
      </div>
      {intervalError && <p className="mt-2 text-xs font-bold text-red-700" role="alert">{intervalError}</p>}

      {schedule.enabled && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-full bg-leaf px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50" disabled={disabled} onClick={() => setOpenAction(openAction === "complete" ? null : "complete")} type="button">
            물주기 완료
          </button>
          <button className="rounded-full bg-amber-100 px-4 py-2.5 text-xs font-bold text-amber-900 disabled:opacity-50" disabled={disabled} onClick={() => setOpenAction(openAction === "snooze" ? null : "snooze")} type="button">
            이번 일정 미루기
          </button>
        </div>
      )}

      {schedule.enabled && openAction === "complete" && <WateringCompleteForm disabled={disabled} onComplete={onComplete} season={season} />}
      {schedule.enabled && openAction === "snooze" && <WateringSnoozeForm disabled={disabled} onSnooze={onSnooze} schedule={schedule} season={season} />}

      <div className="mt-5 flex flex-wrap gap-3 border-t border-ink/10 pt-4">
        <button className="text-xs font-bold text-leaf underline disabled:opacity-50" disabled={disabled || historyState.status === "loading"} onClick={() => { void onLoadHistory(); }} type="button">
          {historyState.status === "closed" ? "완료·미루기 이력 보기" : "이력 새로고침"}
        </button>
        <button className="ml-auto text-xs font-bold text-red-700 disabled:opacity-50" disabled={disabled} onClick={() => { void onDelete(); }} type="button">
          일정 삭제
        </button>
      </div>
      <WateringHistoryPanel disabled={disabled} onReopen={onReopen} state={historyState} />
    </li>
  );
}
