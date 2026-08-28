import Link from "next/link";
import { GROWING_SPACE_LABELS } from "../../crop-catalog/data/crop-labels";
import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season";
import type { GrowingSpace } from "../../growing-space/domain/growing-space";
import {
  CULTIVATION_RECORD_TYPES,
  CULTIVATION_RECORD_TYPE_LABELS,
  type CultivationRecord,
  type CultivationRecordInput,
  type CultivationRecordType,
} from "../domain/cultivation-record";
import { SeasonSummaryPanel } from "../../growing-season/components/season-summary-panel";
import { CultivationRecordCard } from "./cultivation-record-card";
import { CultivationRecordForm } from "./cultivation-record-form";
import styles from "./cultivation-record.module.css";

export type RecordFilter = "all" | CultivationRecordType;

interface CultivationRecordWorkspaceProps {
  actionError: string;
  busy: boolean;
  deletingId: string;
  editingId: string;
  filter: RecordFilter;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onCreate: (input: CultivationRecordInput, photo?: File) => Promise<boolean>;
  onDelete: (record: CultivationRecord) => Promise<void>;
  onDeleteRequest: (recordId: string) => void;
  onEdit: (recordId: string) => void;
  onFilterChange: (filter: RecordFilter) => void;
  onPhotoRemove: (record: CultivationRecord) => Promise<void>;
  onPhotoUpload: (record: CultivationRecord, photo: File) => Promise<boolean>;
  onUpdate: (record: CultivationRecord, input: CultivationRecordInput) => Promise<boolean>;
  records: CultivationRecord[];
  season: PersistedGrowingSeason;
  space: GrowingSpace;
}

export function CultivationRecordWorkspace(props: CultivationRecordWorkspaceProps) {
  const visibleRecords = props.filter === "all"
    ? props.records
    : props.records.filter((record) => record.type === props.filter);
  const counts = countByType(props.records);

  return (
    <div className={styles.page}>
      <SeasonOverview counts={counts} records={props.records} season={props.season} space={props.space} />
      {props.actionError && <p className={styles.actionError} role="alert">{props.actionError}</p>}
      <div className={styles.workspace}>
        <main className={styles.timelineColumn}>
          <div className={styles.listHeading}>
            <div><p>재배 타임라인</p><h2 id="record-list-title">시즌의 변화를 시간순으로</h2></div>
            <span>{visibleRecords.length}개 기록</span>
          </div>
          <RecordFilters counts={counts} onChange={props.onFilterChange} selected={props.filter} total={props.records.length} />
          {visibleRecords.length === 0 ? (
            <RecordEmptyState filtered={props.filter !== "all"} />
          ) : (
            <ol aria-labelledby="record-list-title" className={styles.recordList}>
              {visibleRecords.map((record) => (
                <li key={record.id}>
                  <CultivationRecordCard
                    disabled={props.busy}
                    deleting={props.deletingId === record.id}
                    editing={props.editingId === record.id}
                    onCancelDelete={props.onCancelDelete}
                    onCancelEdit={props.onCancelEdit}
                    onDelete={() => props.onDelete(record)}
                    onDeleteRequest={() => props.onDeleteRequest(record.id)}
                    onEdit={() => props.onEdit(record.id)}
                    onPhotoRemove={() => props.onPhotoRemove(record)}
                    onPhotoUpload={(photo) => props.onPhotoUpload(record, photo)}
                    onUpdate={(input) => props.onUpdate(record, input)}
                    record={record}
                    season={props.season}
                  />
                </li>
              ))}
            </ol>
          )}
        </main>
        <aside className={styles.sideColumn} id="record-create-form">
          <CultivationRecordForm disabled={props.busy} onSubmit={props.onCreate} season={props.season} />
          <SeasonSummaryPanel seasonId={props.season.id} />
          <RecordGuide seasonId={props.season.id} space={props.space} />
        </aside>
      </div>
    </div>
  );
}

function SeasonOverview({ counts, records, season, space }: {
  counts: Record<CultivationRecordType, number>;
  records: CultivationRecord[];
  season: PersistedGrowingSeason;
  space: GrowingSpace;
}) {
  return (
    <section aria-labelledby="record-season-title" className={styles.overview}>
      <div className={styles.overviewCopy}>
        <p>{GROWING_SPACE_LABELS[space.type]} · {space.name}</p>
        <h2 id="record-season-title">{season.name}</h2>
        <span>{formatDate(season.startDate)}부터 {formatDate(season.endDate)}까지의 재배 일지</span>
        <strong>{latestRecordMessage(records)}</strong>
      </div>
      <dl className={styles.overviewStats}>
        <div><dt>전체 기록</dt><dd>{records.length}개</dd></div>
        <div><dt>성장 관찰</dt><dd>{counts.growth}개</dd></div>
        <div><dt>수확</dt><dd>{counts.harvest}회</dd></div>
      </dl>
    </section>
  );
}

function RecordFilters({ counts, onChange, selected, total }: {
  counts: Record<CultivationRecordType, number>;
  onChange: (filter: RecordFilter) => void;
  selected: RecordFilter;
  total: number;
}) {
  return (
    <div aria-label="기록 종류 필터" className={styles.filters} role="group">
      <button aria-pressed={selected === "all"} onClick={() => onChange("all")} type="button">전체 <span>{total}</span></button>
      {CULTIVATION_RECORD_TYPES.map((type) => (
        <button aria-pressed={selected === type} data-type={type} key={type} onClick={() => onChange(type)} type="button">
          {CULTIVATION_RECORD_TYPE_LABELS[type]} <span>{counts[type]}</span>
        </button>
      ))}
    </div>
  );
}

function RecordGuide({ seasonId, space }: { seasonId: string; space: GrowingSpace }) {
  return (
    <section className={styles.guidePanel}>
      <p>기록을 잘 남기는 방법</p>
      <h2>작은 변화도 날짜와 함께 적어 두세요</h2>
      <ul><li>작업에는 파종, 지주 세우기, 비료 주기를 남겨요.</li><li>성장 관찰에는 크기나 잎 상태를 수량과 함께 적어요.</li><li>수확량은 수량과 단위를 함께 입력해야 해요.</li></ul>
      <nav aria-label="시즌 관리 바로가기">
        {space.type === "garden" && <Link href={`/seasons/${seasonId}/layout`}><span>작물 배치</span><strong>이동 →</strong></Link>}
        <Link href={`/seasons/${seasonId}/tasks`}><span>재배 일정</span><strong>이동 →</strong></Link>
        <Link href={`/seasons/${seasonId}/watering`}><span>물주기 관리</span><strong>이동 →</strong></Link>
      </nav>
    </section>
  );
}

function RecordEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className={styles.emptyState}>
      <span aria-hidden="true">일지</span>
      <p>{filtered ? "선택한 종류의 기록이 없어요" : "아직 남긴 기록이 없어요"}</p>
      <h3>{filtered ? "다른 종류를 확인해 보세요" : "첫 기록을 남겨 보세요"}</h3>
      <strong>한 일과 식물의 작은 변화를 기록하면 다음 시즌을 계획할 때 좋은 기준이 됩니다.</strong>
      {!filtered && <Link href="#record-create-form">기록 남기러 가기 →</Link>}
    </div>
  );
}

export function CultivationRecordLoadingState() {
  return <div aria-label="시즌 기록을 불러오는 중" className={styles.loading} role="status"><div /><div><span /><span /></div></div>;
}

export function CultivationRecordLoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={styles.errorState} role="alert">
      <p>기록을 불러오지 못했어요</p>
      <h2>{message}</h2>
      {onRetry ? <button onClick={onRetry} type="button">다시 시도</button> : <Link href="/seasons">시즌 목록으로 돌아가기</Link>}
    </div>
  );
}

function countByType(records: CultivationRecord[]): Record<CultivationRecordType, number> {
  const counts = { work: 0, growth: 0, harvest: 0, watering: 0 };
  records.forEach((record) => { counts[record.type] += 1; });
  return counts;
}

function latestRecordMessage(records: CultivationRecord[]): string {
  if (records.length === 0) return "첫 기록을 남기면 이곳에 최근 활동을 알려 드려요.";
  return `최근 기록은 ${formatDateTime(records[0].occurredAt)}에 남겼어요.`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
