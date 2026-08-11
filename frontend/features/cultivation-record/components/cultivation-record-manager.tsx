"use client";

import Link from "next/link";
import { useState } from "react";
import { useGrowingSeasons } from "../../growing-season/hooks/use-growing-seasons";
import {
  CULTIVATION_RECORD_TYPES,
  CULTIVATION_RECORD_TYPE_LABELS,
  type CultivationRecord,
  type CultivationRecordInput,
  type CultivationRecordType,
} from "../domain/cultivation-record";
import { useCultivationRecords } from "../hooks/use-cultivation-records";
import {
  createCultivationRecord,
  deleteCultivationRecord,
  updateCultivationRecord,
} from "../infrastructure/cultivation-record-api";
import { CultivationRecordForm } from "./cultivation-record-form";

type RecordFilter = "all" | CultivationRecordType;

const TYPE_STYLES: Record<CultivationRecordType, string> = {
  work: "bg-sky-50 text-sky-700",
  growth: "bg-leaf-soft text-leaf-dark",
  harvest: "bg-amber-50 text-amber-800",
  watering: "bg-blue-50 text-blue-700",
};

export function CultivationRecordManager({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const recordsState = useCultivationRecords(seasonId);
  const [filter, setFilter] = useState<RecordFilter>("all");
  const [editingId, setEditingId] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [actionError, setActionError] = useState("");

  if (seasonsState.status === "error") return <Message message={seasonsState.message} />;
  if (recordsState.status === "loading") return <p className="surface-panel p-5 text-muted">시즌 기록을 불러오고 있습니다.</p>;
  if (recordsState.status === "error") return <Message message={recordsState.message} />;

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <Message message="재배 시즌을 찾을 수 없습니다." />;

  const visibleRecords = filter === "all"
    ? recordsState.records
    : recordsState.records.filter((record) => record.type === filter);

  async function runAction(key: string, action: () => Promise<void>): Promise<boolean> {
    setBusyKey(key);
    setActionError("");
    try {
      await action();
      await recordsState.reload();
      return true;
    } catch (error) {
      setActionError(toMessage(error));
      return false;
    } finally {
      setBusyKey("");
    }
  }

  async function create(input: CultivationRecordInput): Promise<boolean> {
    return runAction("create", async () => { await createCultivationRecord(seasonId, input); });
  }

  async function update(record: CultivationRecord, input: CultivationRecordInput): Promise<boolean> {
    const saved = await runAction(record.id, async () => { await updateCultivationRecord(record, input); });
    if (saved) setEditingId("");
    return saved;
  }

  async function remove(record: CultivationRecord): Promise<void> {
    if (!window.confirm("이 시즌 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없습니다.")) return;
    await runAction(record.id, async () => { await deleteCultivationRecord(record); });
  }

  return (
    <div>
      <section className="rounded-3xl bg-leaf-soft/60 p-5" aria-labelledby="record-season-title">
        <p className="text-sm font-bold text-leaf">재배 시즌</p>
        <h2 className="mt-1 text-xl font-bold" id="record-season-title">{season.name}</h2>
        <p className="mt-2 text-sm text-muted">{season.startDate} ~ {season.endDate} · 기록 {recordsState.records.length}개</p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="시즌 관리 메뉴">
          <Link className="rounded-full bg-white px-4 py-2 text-xs font-bold text-leaf-dark" href={`/seasons/${seasonId}/layout`}>작물 배치</Link>
          <Link className="rounded-full bg-white px-4 py-2 text-xs font-bold text-leaf-dark" href={`/seasons/${seasonId}/tasks`}>재배 일정</Link>
          <Link className="rounded-full bg-white px-4 py-2 text-xs font-bold text-leaf-dark" href={`/seasons/${seasonId}/watering`}>물주기</Link>
        </nav>
      </section>

      {actionError && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{actionError}</p>}
      <CultivationRecordForm disabled={busyKey !== ""} onSubmit={create} season={season} />

      <section className="mt-8" aria-labelledby="record-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold" id="record-list-title">시즌 기록</h2>
          <label className="text-sm font-bold">
            <span className="sr-only">기록 종류 필터</span>
            <select className="rounded-full border border-ink/15 bg-white px-4 py-2" onChange={(event) => setFilter(event.target.value as RecordFilter)} value={filter}>
              <option value="all">전체 기록</option>
              {CULTIVATION_RECORD_TYPES.map((type) => <option key={type} value={type}>{CULTIVATION_RECORD_TYPE_LABELS[type]}</option>)}
            </select>
          </label>
        </div>

        {visibleRecords.length === 0 ? (
          <div className="surface-panel mt-5 border-dashed p-7 text-center">
            <h3 className="text-xl font-bold">{filter === "all" ? "아직 남긴 기록이 없어요" : "이 종류의 기록이 없어요"}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">한 일과 식물의 변화를 남기면 시즌을 돌아보기 쉬워집니다.</p>
          </div>
        ) : (
          <ol className="mt-5 space-y-4">
            {visibleRecords.map((record) => (
              <li className="surface-panel p-5 transition hover:shadow-[var(--shadow-md)] sm:p-6" key={record.id}>
                {editingId === record.id ? (
                  <CultivationRecordForm
                    disabled={busyKey !== ""}
                    onCancel={() => setEditingId("")}
                    onSubmit={(input) => update(record, input)}
                    record={record}
                    season={season}
                  />
                ) : (
                  <RecordDetail disabled={busyKey !== ""} onDelete={() => remove(record)} onEdit={() => setEditingId(record.id)} record={record} />
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function RecordDetail({ disabled, onDelete, onEdit, record }: {
  disabled: boolean;
  onDelete: () => Promise<void>;
  onEdit: () => void;
  record: CultivationRecord;
}) {
  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <time className="text-sm font-bold text-leaf" dateTime={record.occurredAt}>{formatDateTime(record.occurredAt)}</time>
          {record.quantity !== null && <p className="mt-2 text-lg font-bold">{formatQuantity(record.quantity)} {record.unit}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${TYPE_STYLES[record.type]}`}>{CULTIVATION_RECORD_TYPE_LABELS[record.type]}</span>
      </div>
      <p className={`whitespace-pre-wrap text-sm leading-6 ${record.notes ? "mt-4 text-ink" : "mt-3 text-muted"}`}>{record.notes || "메모 없이 남긴 기록입니다."}</p>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
        <button className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold disabled:opacity-50" disabled={disabled} onClick={onEdit} type="button">수정</button>
        <button className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50" disabled={disabled} onClick={() => { void onDelete(); }} type="button">삭제</button>
      </div>
    </article>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 3 }).format(value);
}

function Message({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-red-50 p-5 text-red-700" role="alert">
      <p className="font-semibold">{message}</p>
      <Link className="mt-4 inline-flex font-bold underline" href="/seasons">시즌 목록으로 돌아가기</Link>
    </div>
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "시즌 기록 요청을 처리하지 못했습니다.";
}
