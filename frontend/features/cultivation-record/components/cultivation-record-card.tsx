import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season";
import {
  CULTIVATION_RECORD_TYPE_LABELS,
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
        {deleting ? (
          <div className={styles.deleteConfirm} role="alert">
            <div><strong>이 기록을 삭제할까요?</strong><span>삭제한 기록은 되돌릴 수 없습니다.</span></div>
            <div><button disabled={disabled} onClick={onCancelDelete} type="button">취소</button><button disabled={disabled} onClick={() => { void onDelete(); }} type="button">삭제하기</button></div>
          </div>
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 3 }).format(value);
}
