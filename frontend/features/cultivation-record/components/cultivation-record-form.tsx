"use client";

import { useState } from "react";
import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season";
import {
  CULTIVATION_RECORD_TYPES,
  CULTIVATION_RECORD_TYPE_LABELS,
  createRecordDraft,
  validateCultivationRecordDraft,
  validateRecordPhoto,
  type CultivationRecord,
  type CultivationRecordDraft,
  type CultivationRecordDraftErrors,
  type CultivationRecordInput,
} from "../domain/cultivation-record";
import styles from "./cultivation-record.module.css";

export function CultivationRecordForm({
  disabled,
  onCancel,
  onSubmit,
  record,
  season,
}: {
  disabled: boolean;
  onCancel?: () => void;
  onSubmit: (input: CultivationRecordInput, photo?: File) => Promise<boolean>;
  record?: CultivationRecord;
  season: PersistedGrowingSeason;
}) {
  const [draft, setDraft] = useState<CultivationRecordDraft>(() => createRecordDraft(season, record));
  const [errors, setErrors] = useState<CultivationRecordDraftErrors>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");

  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;

    const message = validateRecordPhoto(selected);
    setPhotoError(message ?? "");
    setPhoto(message === null ? selected : null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCultivationRecordDraft(draft, season);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    const saved = await onSubmit(validation.value, photo ?? undefined);
    if (saved && !record) {
      setDraft(createRecordDraft(season));
      setPhoto(null);
      setPhotoError("");
    }
  }

  return (
    <form
      className={record ? styles.editForm : styles.createForm}
      onSubmit={(event) => { void submit(event); }}
    >
      <div className={styles.formHeading}>
        <span aria-hidden="true">{record ? "수정" : "기록"}</span>
        <div><p>{record ? "기록 다듬기" : "오늘의 재배 일지"}</p><h2>{record ? "기록 수정" : "새 기록 남기기"}</h2></div>
      </div>
      <fieldset className={styles.typeFieldset} disabled={disabled}>
        <legend>기록 종류</legend>
        <div className={styles.typeOptions}>
          {CULTIVATION_RECORD_TYPES.map((type) => (
            <label data-type={type} key={type}>
              <input checked={draft.type === type} name={record ? `record-type-${record.id}` : "record-type-new"} onChange={() => setDraft({ ...draft, type })} type="radio" value={type} />
              <span aria-hidden="true">{CULTIVATION_RECORD_TYPE_LABELS[type].slice(0, 1)}</span>
              <strong>{CULTIVATION_RECORD_TYPE_LABELS[type]}</strong>
            </label>
          ))}
        </div>
        {errors.type && <span className={styles.fieldError} role="alert">{errors.type}</span>}
      </fieldset>
      <div className={styles.fieldGrid}>
        <Field error={errors.occurredAtLocal} label="기록 시각">
          <input
            className={styles.input}
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
            className={styles.input}
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
            className={styles.input}
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
          className={`${styles.input} ${styles.textarea}`}
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          placeholder="한 일이나 식물의 변화를 적어 보세요."
          value={draft.notes}
        />
      </Field>
      <p className={styles.characterCount}>{draft.notes.length} / 2,000</p>
      {!record && (
        <div className={styles.photoField}>
          <span>사진 (선택)</span>
          <div className={styles.photoUpload}>
            <label className={styles.photoButton} htmlFor="record-photo-new">
              {photo ? "다른 사진 고르기" : "사진 고르기"}
            </label>
            <input
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              id="record-photo-new"
              onChange={choosePhoto}
              type="file"
            />
            {photo
              ? <span className={styles.photoChosen}>{photo.name}</span>
              : <span>JPG · PNG · WEBP, 5MB까지</span>}
            {photo && (
              <button
                className={styles.photoClear}
                disabled={disabled}
                onClick={() => { setPhoto(null); setPhotoError(""); }}
                type="button"
              >
                선택 취소
              </button>
            )}
          </div>
          {photoError && <strong className={styles.fieldError} role="alert">{photoError}</strong>}
        </div>
      )}
      <div className={styles.formActions}>
        <button className={styles.submitButton} disabled={disabled} type="submit">
          {disabled ? "저장 중..." : record ? "수정 저장" : "기록 추가"}
        </button>
        {onCancel && (
          <button className={styles.cancelButton} disabled={disabled} onClick={onCancel} type="button">
            취소
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {error && <strong className={styles.fieldError} role="alert">{error}</strong>}
    </label>
  );
}
