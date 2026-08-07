import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import {
  isSeasonRecordType,
  isValidDateOnly,
  type SeasonRecord,
} from "../domain/season-record.ts";

export const SEASON_RECORDS_STORAGE_KEY = "simeobom:season-records";

export class InvalidSeasonRecordDataError extends Error {
  constructor() {
    super("저장된 시즌 기록 데이터를 읽을 수 없습니다.");
    this.name = "InvalidSeasonRecordDataError";
  }
}

export function getSeasonRecordsSnapshot(storage: KeyValueStorage): string {
  return storage.getItem(SEASON_RECORDS_STORAGE_KEY) ?? "";
}

export function parseSeasonRecordsSnapshot(snapshot: string): SeasonRecord[] {
  if (!snapshot) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new InvalidSeasonRecordDataError();
  }

  if (!Array.isArray(parsed)) {
    throw new InvalidSeasonRecordDataError();
  }

  const recordIds = new Set<string>();
  if (!parsed.every((value) => {
    if (!isSeasonRecord(value) || recordIds.has(value.id)) return false;
    recordIds.add(value.id);
    return true;
  })) {
    throw new InvalidSeasonRecordDataError();
  }
  return parsed;
}

export function loadSeasonRecords(storage: KeyValueStorage): SeasonRecord[] {
  return parseSeasonRecordsSnapshot(getSeasonRecordsSnapshot(storage));
}

export function addSeasonRecord(
  storage: KeyValueStorage,
  record: SeasonRecord,
) {
  if (!isSeasonRecord(record)) {
    throw new InvalidSeasonRecordDataError();
  }
  const current = loadSeasonRecords(storage);
  if (current.some((item) => item.id === record.id)) {
    throw new Error("이미 저장된 시즌 기록 ID입니다.");
  }
  saveSeasonRecords(storage, [...current, record]);
}

export function deleteSeasonRecord(
  storage: KeyValueStorage,
  recordId: string,
) {
  const current = loadSeasonRecords(storage);
  if (!current.some((record) => record.id === recordId)) {
    throw new Error("삭제할 시즌 기록을 찾을 수 없습니다.");
  }
  saveSeasonRecords(
    storage,
    current.filter((record) => record.id !== recordId),
  );
}

function saveSeasonRecords(
  storage: KeyValueStorage,
  records: readonly SeasonRecord[],
) {
  storage.setItem(SEASON_RECORDS_STORAGE_KEY, JSON.stringify(records));
}

function isSeasonRecord(value: unknown): value is SeasonRecord {
  if (!isRecord(value)) return false;

  return typeof value.id === "string"
    && value.id.length > 0
    && typeof value.seasonId === "string"
    && value.seasonId.length > 0
    && isSeasonRecordType(value.type)
    && isValidDateOnly(value.recordedOn)
    && typeof value.notes === "string"
    && value.notes.length <= 500
    && typeof value.createdAt === "string"
    && isIsoDateTime(value.createdAt);
}

function isIsoDateTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
