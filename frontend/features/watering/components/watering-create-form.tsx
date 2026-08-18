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
import styles from "./watering.module.css";

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
    <form className={styles.createPanel} onSubmit={(event) => { void submit(event); }}>
      <div className={styles.createHeading}>
        <span aria-hidden="true">01</span>
        <div><p>새 물주기 일정</p><h2>반복 기준을 정해 주세요</h2></div>
      </div>
      <p className={styles.createDescription}>텃밭에 배치한 작물마다 하나의 반복 일정을 만들 수 있어요.</p>
      <div className={styles.createFields}>
        <Field error={errors.cropId} label="작물">
          <select
            className={styles.input}
            disabled={disabled}
            name="cropId"
            onChange={(event) => setDraft({ ...draft, cropId: event.target.value })}
            value={draft.cropId}
          >
            {crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
          </select>
        </Field>
        <Field error={errors.intervalDays} label="반복 간격">
          <div className={styles.inputWithUnit}>
            <input
              className={styles.input}
              disabled={disabled}
              max="365"
              min="1"
              name="intervalDays"
              onChange={(event) => setDraft({ ...draft, intervalDays: event.target.value })}
              type="number"
              value={draft.intervalDays}
            />
            <span>일</span>
          </div>
        </Field>
        <Field error={errors.nextWateringAtLocal} label="첫 물주기">
          <input
            className={styles.input}
            disabled={disabled}
            max={`${season.endDate}T23:59`}
            min={`${season.startDate}T00:00`}
            name="nextWateringAtLocal"
            onChange={(event) => setDraft({ ...draft, nextWateringAtLocal: event.target.value })}
            type="datetime-local"
            value={draft.nextWateringAtLocal}
          />
        </Field>
      </div>
      <button className={styles.createButton} disabled={disabled} type="submit">
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
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {error && <strong role="alert">{error}</strong>}
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
