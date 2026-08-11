"use client";

import { useState } from "react";
import type { CropReference } from "../../crop-catalog/domain/crop-reference";
import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season";
import {
  validateWateringScheduleDraft,
  type WateringScheduleDraft,
  type WateringScheduleInput,
} from "../domain/watering";
import { toLocalDateTimeInput } from "../../../shared/domain/local-date-time";

export function WateringCreateForm({
  crops,
  disabled,
  onCreate,
  season,
}: {
  crops: readonly CropReference[];
  disabled: boolean;
  onCreate: (input: WateringScheduleInput) => Promise<boolean>;
  season: PersistedGrowingSeason;
}) {
  const [draft, setDraft] = useState<WateringScheduleDraft>(() => ({
    cropId: crops[0]?.id ?? "",
    intervalDays: "3",
    nextWateringAtLocal: initialDateTime(season),
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof WateringScheduleDraft, string>>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedDraft: WateringScheduleDraft = {
      cropId: String(formData.get("cropId") ?? ""),
      intervalDays: String(formData.get("intervalDays") ?? ""),
      nextWateringAtLocal: String(formData.get("nextWateringAtLocal") ?? ""),
    };
    const validation = validateWateringScheduleDraft(submittedDraft, season);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    await onCreate(validation.value);
  }

  return (
    <form className="mt-5 rounded-3xl border border-leaf/15 bg-leaf-soft/35 p-5 sm:p-6" onSubmit={(event) => { void submit(event); }}>
      <div>
        <p className="text-sm font-bold text-leaf">새 물주기 일정</p>
        <h2 className="mt-1 text-xl font-bold">배치 작물에 반복 일정을 추가하세요</h2>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Field error={errors.cropId} label="작물">
          <select
            className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
            disabled={disabled}
            name="cropId"
            onChange={(event) => setDraft({ ...draft, cropId: event.target.value })}
            value={draft.cropId}
          >
            {crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
          </select>
        </Field>
        <Field error={errors.intervalDays} label="반복 간격">
          <div className="relative mt-2">
            <input
              className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 pr-12"
              disabled={disabled}
              max="365"
              min="1"
              name="intervalDays"
              onChange={(event) => setDraft({ ...draft, intervalDays: event.target.value })}
              type="number"
              value={draft.intervalDays}
            />
            <span className="pointer-events-none absolute right-4 top-3.5 text-sm text-muted">일</span>
          </div>
        </Field>
        <Field error={errors.nextWateringAtLocal} label="첫 물주기">
          <input
            className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
            defaultValue={draft.nextWateringAtLocal}
            disabled={disabled}
            max={`${season.endDate}T23:59`}
            min={`${season.startDate}T00:00`}
            name="nextWateringAtLocal"
            type="datetime-local"
          />
        </Field>
      </div>
      <button className="mt-5 rounded-full bg-leaf px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={disabled} type="submit">
        {disabled ? "저장 중..." : "물주기 일정 추가"}
      </button>
    </form>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      {children}
      {error && <span className="mt-2 block text-xs text-red-700" role="alert">{error}</span>}
    </label>
  );
}

function initialDateTime(season: Pick<PersistedGrowingSeason, "startDate" | "endDate">): string {
  const now = new Date();
  const today = toLocalDateTimeInput(now).slice(0, 10);
  if (today < season.startDate) return `${season.startDate}T09:00`;
  if (today > season.endDate) return `${season.endDate}T09:00`;
  return toLocalDateTimeInput(now);
}
