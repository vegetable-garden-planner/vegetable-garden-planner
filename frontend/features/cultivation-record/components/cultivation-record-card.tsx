import { useState } from "react";
import { InlineConfirm } from "@/components/inline-confirm";
import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season";
import {
  CULTIVATION_RECORD_TYPE_LABELS,
  validateRecordPhoto,
  type CultivationRecord,
  type CultivationRecordInput,
} from "../domain/cultivation-record";
import { CultivationRecordForm } from "./cultivation-record-form";
import styles from "./cultivation-record.module.css";

export function CultivationRecordCard({
  disabled,
  deleting,
  editing,
  onCancelDelete,
  onCancelEdit,
  onDelete,
  onDeleteRequest,
  onEdit,
  onPhotoRemove,
  onPhotoUpload,
  onUpdate,
  record,
  season,
}: {
  disabled: boolean;
  deleting: boolean;
  editing: boolean;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onDelete: () => Promise<void>;
  onDeleteRequest: () => void;
  onEdit: () => void;
  onPhotoRemove: () => Promise<void>;
  onPhotoUpload: (photo: File) => Promise<boolean>;
  onUpdate: (input: CultivationRecordInput) => Promise<boolean>;
  record: CultivationRecord;
  season: PersistedGrowingSeason;
}) {
  if (editing) {
    return <CultivationRecordForm disabled={disabled} onCancel={onCancelEdit} onSubmit={onUpdate} record={record} season={season} />;
  }

  return (
    <article className={styles.recordCard} data-type={record.type}>
      <div className={styles.timelineMarker}><span aria-hidden="true">{CULTIVATION_RECORD_TYPE_LABELS[record.type].slice(0, 1)}</span></div>
      <div className={styles.recordBody}>
        <div className={styles.recordHeader}>
          <div><time dateTime={record.occurredAt}>{formatDate(record.occurredAt)}</time><span>{formatTime(record.occurredAt)}</span></div>
          <strong>{CULTIVATION_RECORD_TYPE_LABELS[record.type]}</strong>
        </div>
        {record.quantity !== null && <p className={styles.quantity}><span>측정·수확량</span>{formatQuantity(record.quantity)} {record.unit}</p>}
        <p className={record.notes ? styles.notes : styles.emptyNotes}>{record.notes || "메모 없이 남긴 기록입니다."}</p>
        <RecordPhoto disabled={disabled} onRemove={onPhotoRemove} onUpload={onPhotoUpload} record={record} />
        {deleting ? (
          <InlineConfirm
            description="삭제한 기록은 되돌릴 수 없습니다."
            disabled={disabled}
            onCancel={onCancelDelete}
            onConfirm={() => { void onDelete(); }}
            title="이 기록을 삭제할까요?"
          />
        ) : (
          <div className={styles.recordActions}>
            <button disabled={disabled} onClick={onEdit} type="button">수정</button>
            <button disabled={disabled} onClick={onDeleteRequest} type="button">삭제</button>
          </div>
        )}
      </div>
    </article>
  );
}

function RecordPhoto({ disabled, onRemove, onUpload, record }: {
  disabled: boolean;
  onRemove: () => Promise<void>;
  onUpload: (photo: File) => Promise<boolean>;
  record: CultivationRecord;
}) {
  const [error, setError] = useState("");
  const inputId = `record-photo-${record.id}`;
  const typeLabel = CULTIVATION_RECORD_TYPE_LABELS[record.type];

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0];
    event.target.value = "";
    if (!photo) return;

    const message = validateRecordPhoto(photo);
    setError(message ?? "");
    if (message === null) await onUpload(photo);
  }

  if (record.photoUrl !== null) {
    return (
      <figure className={styles.photo}>
        {/* 회원이 올린 사진은 백엔드 도메인에서 그대로 내려받는다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={`${typeLabel} 기록에 첨부한 사진`} src={record.photoUrl} />
        <figcaption>
          <button disabled={disabled} onClick={() => { void onRemove(); }} type="button">사진 삭제</button>
        </figcaption>
      </figure>
    );
  }

  return (
    <div className={styles.photoUpload}>
      <label className={styles.photoButton} htmlFor={inputId}>사진 추가</label>
      <input
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        id={inputId}
        onChange={(event) => { void choose(event); }}
        type="file"
      />
      <span>JPG · PNG · WEBP, 5MB까지</span>
      {error && <strong className={styles.fieldError} role="alert">{error}</strong>}
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 3 }).format(value);
}
