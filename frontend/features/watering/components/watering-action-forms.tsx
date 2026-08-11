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
    <form className="mt-4 rounded-2xl bg-sky-50 p-4" onSubmit={(event) => { void submit(event); }}>
      <p className="text-sm font-bold text-sky-800">물주기 완료 기록</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-sky-900">
          완료 시각
          <input
            className="mt-1.5 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-ink"
            defaultValue={initialCompletionDateTime(season)}
            disabled={disabled}
            max={`${season.endDate}T23:59`}
            min={`${season.startDate}T00:00`}
            name="wateredAtLocal"
            type="datetime-local"
          />
        </label>
        <label className="text-xs font-bold text-sky-900">
          물의 양 (ml, 선택)
          <input
            className="mt-1.5 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-ink"
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
      <label className="mt-3 block text-xs font-bold text-sky-900">
        메모 (선택)
        <input
          className="mt-1.5 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-ink"
          disabled={disabled}
          maxLength={500}
          name="memo"
          onChange={(event) => setMemo(event.target.value)}
          placeholder="흙 상태나 물 준 양을 기록해 보세요"
          value={memo}
        />
      </label>
      {error && <p className="mt-3 text-xs font-bold text-red-700" role="alert">{error}</p>}
      <button className="mt-3 rounded-full bg-sky-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50" disabled={disabled} type="submit">
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
  onSnooze: (snoozedUntil: string) => Promise<void>;
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
    <form className="mt-4 rounded-2xl bg-amber-50 p-4" onSubmit={(event) => { void submit(event); }}>
      <p className="text-sm font-bold text-amber-900">이번 물주기 미루기</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-xs font-bold text-amber-900">
          변경할 예정 시각
          <input
            className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-ink"
            defaultValue={initialSnoozeDateTime(schedule, season)}
            disabled={disabled}
            max={`${season.endDate}T23:59`}
            min={`${season.startDate}T00:00`}
            name="snoozedUntilLocal"
            type="datetime-local"
          />
        </label>
        <button className="rounded-full bg-amber-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50" disabled={disabled} type="submit">
          이 시각으로 미루기
        </button>
      </div>
      {error && <p className="mt-3 text-xs font-bold text-red-700" role="alert">{error}</p>}
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
