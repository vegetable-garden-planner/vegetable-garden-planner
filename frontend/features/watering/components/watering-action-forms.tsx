"use client";

import { useState } from "react";
import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season";
import {
  type CompleteWateringInput,
  type WateringSchedule,
} from "../domain/watering";
import {
  localDateTimeToOffsetIso,
  toLocalDateTimeInput,
} from "../../../shared/domain/local-date-time";
import styles from "./watering.module.css";

export function WateringCompleteForm({
  disabled,
  onComplete,
  season,
}: {
  disabled: boolean;
  onComplete: (input: CompleteWateringInput) => Promise<boolean>;
  season: PersistedGrowingSeason;
}) {
  const [amountMl, setAmountMl] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedWateredAt = String(formData.get("wateredAtLocal") ?? "");
    const submittedAmount = String(formData.get("amountMl") ?? "");
    const submittedMemo = String(formData.get("memo") ?? "");
    const amount = submittedAmount === "" ? null : Number(submittedAmount);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(submittedWateredAt)
      || submittedWateredAt.slice(0, 10) < season.startDate
      || submittedWateredAt.slice(0, 10) > season.endDate) {
      setError("완료 시각은 재배 시즌 안이어야 합니다.");
      return;
    }
    if (amount !== null && (!Number.isInteger(amount) || amount < 1 || amount > 100000)) {
      setError("물의 양은 1ml 이상 100,000ml 이하로 입력해 주세요.");
      return;
    }
    if (submittedMemo.trim().length > 500) {
      setError("메모는 500자 이하로 입력해 주세요.");
      return;
    }

    setError("");
    const completed = await onComplete({
      wateredAt: localDateTimeToOffsetIso(submittedWateredAt),
      amountMl: amount,
      memo: submittedMemo.trim(),
    });
    if (!completed) return;
    setAmountMl("");
    setMemo("");
  }

  return (
    <form className={`${styles.actionPanel} ${styles.completionPanel}`} onSubmit={(event) => { void submit(event); }}>
      <div className={styles.actionPanelHeading}><span aria-hidden="true">완료</span><div><p>물주기 완료 기록</p><strong>실제로 물을 준 내용을 남겨 주세요</strong></div></div>
      <div className={styles.actionFieldGrid}>
        <label className={styles.actionField}>
          <span>완료 시각</span>
          <input
            className={styles.input}
            defaultValue={initialCompletionDateTime(season)}
            disabled={disabled}
            max={`${season.endDate}T23:59`}
            min={`${season.startDate}T00:00`}
            name="wateredAtLocal"
            type="datetime-local"
          />
        </label>
        <label className={styles.actionField}>
          <span>물의 양 (ml, 선택)</span>
          <input
            className={styles.input}
            disabled={disabled}
            max="100000"
            min="1"
            name="amountMl"
            onChange={(event) => setAmountMl(event.target.value)}
            placeholder="예: 500"
            type="number"
            value={amountMl}
          />
        </label>
      </div>
      <label className={styles.actionField}>
        <span>메모 (선택)</span>
        <input
          className={styles.input}
          disabled={disabled}
          maxLength={500}
          name="memo"
          onChange={(event) => setMemo(event.target.value)}
          placeholder="흙 상태나 물 준 양을 기록해 보세요"
          value={memo}
        />
      </label>
      {error && <p className={styles.inlineError} role="alert">{error}</p>}
      <button className={styles.actionSubmit} disabled={disabled} type="submit">
        완료로 기록
      </button>
    </form>
  );
}

export function WateringSnoozeForm({
  disabled,
  onSnooze,
  schedule,
  season,
}: {
  disabled: boolean;
  onSnooze: (snoozedUntil: string) => Promise<boolean>;
  schedule: WateringSchedule;
  season: PersistedGrowingSeason;
}) {
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedSnoozedUntil = String(formData.get("snoozedUntilLocal") ?? "");
    let snoozedUntil: string;
    try {
      snoozedUntil = localDateTimeToOffsetIso(submittedSnoozedUntil);
    } catch {
      setError("올바른 미루기 시각을 입력해 주세요.");
      return;
    }
    if (submittedSnoozedUntil.slice(0, 10) < season.startDate
      || submittedSnoozedUntil.slice(0, 10) > season.endDate) {
      setError("미루기 시각은 재배 시즌 안이어야 합니다.");
      return;
    }
    if (Date.parse(snoozedUntil) <= Date.parse(schedule.nextWateringAt)) {
      setError("현재 예정 시각보다 늦은 시각을 선택해 주세요.");
      return;
    }

    setError("");
    await onSnooze(snoozedUntil);
  }

  return (
    <form className={`${styles.actionPanel} ${styles.snoozePanel}`} onSubmit={(event) => { void submit(event); }}>
      <div className={styles.actionPanelHeading}><span aria-hidden="true">미룸</span><div><p>이번 물주기 미루기</p><strong>현재 예정 시각보다 늦게 선택해 주세요</strong></div></div>
      <div className={styles.snoozeFields}>
        <label className={styles.actionField}>
          <span>변경할 예정 시각</span>
          <input
            className={styles.input}
            defaultValue={initialSnoozeDateTime(schedule, season)}
            disabled={disabled}
            max={`${season.endDate}T23:59`}
            min={`${season.startDate}T00:00`}
            name="snoozedUntilLocal"
            type="datetime-local"
          />
        </label>
        <button className={styles.snoozeSubmit} disabled={disabled} type="submit">
          이 시각으로 미루기
        </button>
      </div>
      {error && <p className={styles.inlineError} role="alert">{error}</p>}
    </form>
  );
}

function initialCompletionDateTime(
  season: Pick<PersistedGrowingSeason, "startDate" | "endDate">,
): string {
  const now = toLocalDateTimeInput(new Date());
  if (now.slice(0, 10) < season.startDate) return `${season.startDate}T09:00`;
  if (now.slice(0, 10) > season.endDate) return `${season.endDate}T09:00`;
  return now;
}

function initialSnoozeDateTime(
  schedule: WateringSchedule,
  season: Pick<PersistedGrowingSeason, "endDate">,
): string {
  const next = new Date(schedule.nextWateringAt);
  next.setDate(next.getDate() + 1);
  const candidate = toLocalDateTimeInput(next);
  return candidate.slice(0, 10) > season.endDate
    ? `${season.endDate}T23:59`
    : candidate;
}
