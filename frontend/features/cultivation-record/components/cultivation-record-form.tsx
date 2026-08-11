"use client";

import { useState } from "react";
import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season";
import {
  CULTIVATION_RECORD_TYPES,
  CULTIVATION_RECORD_TYPE_LABELS,
  createRecordDraft,
  validateCultivationRecordDraft,
  type CultivationRecord,
  type CultivationRecordDraft,
  type CultivationRecordDraftErrors,
  type CultivationRecordInput,
} from "../domain/cultivation-record";

export function CultivationRecordForm({
  disabled,
  onCancel,
  onSubmit,
  record,
  season,
}: {
  disabled: boolean;
  onCancel?: () => void;
  onSubmit: (input: CultivationRecordInput) => Promise<boolean>;
  record?: CultivationRecord;
  season: PersistedGrowingSeason;
}) {
  const [draft, setDraft] = useState<CultivationRecordDraft>(() => createRecordDraft(season, record));
  const [errors, setErrors] = useState<CultivationRecordDraftErrors>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCultivationRecordDraft(draft, season);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    const saved = await onSubmit(validation.value);
    if (saved && !record) setDraft(createRecordDraft(season));
  }

  const inputClass = "mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 disabled:opacity-60";

  return (
    <form
      className={record ? "rounded-2xl bg-leaf-soft/35 p-4" : "mt-5 rounded-3xl border border-leaf/15 bg-leaf-soft/35 p-5 sm:p-6"}
      onSubmit={(event) => { void submit(event); }}
    >
      <h2 className="text-lg font-bold">{record ? "기록 수정" : "새 기록 남기기"}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field error={errors.type} label="기록 종류">
          <select
            className={inputClass}
            disabled={disabled}
            onChange={(event) => setDraft({ ...draft, type: event.target.value })}
            value={draft.type}
          >
            {CULTIVATION_RECORD_TYPES.map((type) => (
              <option key={type} value={type}>{CULTIVATION_RECORD_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </Field>
        <Field error={errors.occurredAtLocal} label="기록 시각">
          <input
            className={inputClass}
            disabled={disabled}
            max={`${season.endDate}T23:59`}
            min={`${season.startDate}T00:00`}
            onChange={(event) => setDraft({ ...draft, occurredAtLocal: event.target.value })}
            type="datetime-local"
            value={draft.occurredAtLocal}
          />
        </Field>
        <Field error={errors.quantity} label="수량 (선택)">
          <input
            className={inputClass}
            disabled={disabled}
            min="0.001"
            onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
            placeholder="예: 1.5"
            step="any"
            type="number"
            value={draft.quantity}
          />
        </Field>
        <Field error={errors.unit} label="단위 (선택)">
          <input
            className={inputClass}
            disabled={disabled}
            maxLength={20}
            onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
            placeholder="예: kg, cm, 개"
            value={draft.unit}
          />
        </Field>
      </div>
      <Field error={errors.notes} label="메모">
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          placeholder="한 일이나 식물의 변화를 적어 보세요."
          value={draft.notes}
        />
      </Field>
      <p className="mt-1 text-right text-xs text-muted">{draft.notes.length} / 2,000</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-full bg-leaf px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={disabled} type="submit">
          {disabled ? "저장 중..." : record ? "수정 저장" : "기록 추가"}
        </button>
        {onCancel && (
          <button className="rounded-full border border-ink/15 px-5 py-3 text-sm font-bold disabled:opacity-50" disabled={disabled} onClick={onCancel} type="button">
            취소
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return (
    <label className="mt-4 block text-sm font-bold">
      {label}
      {children}
      {error && <span className="mt-2 block text-xs text-red-700" role="alert">{error}</span>}
    </label>
  );
}
