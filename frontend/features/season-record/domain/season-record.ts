import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";

export const SEASON_RECORD_TYPES = [
  "watering",
  "work",
  "growth",
  "harvest",
] as const;

export type SeasonRecordType = (typeof SEASON_RECORD_TYPES)[number];

export interface SeasonRecordFormValues {
  seasonId: string;
  type: SeasonRecordType;
  recordedOn: string;
  notes: string;
}

export type SeasonRecordInput = SeasonRecordFormValues;

export interface SeasonRecord extends SeasonRecordInput {
  id: string;
  createdAt: string;
}

export type SeasonRecordField = keyof SeasonRecordFormValues;
export type SeasonRecordErrors = Partial<Record<SeasonRecordField, string>>;

export type SeasonRecordValidation =
  | { valid: true; value: SeasonRecordInput }
  | { valid: false; errors: SeasonRecordErrors };

const MAX_NOTES_LENGTH = 500;

export function validateSeasonRecord(
  values: SeasonRecordFormValues,
  season: GrowingSeason | undefined,
): SeasonRecordValidation {
  const errors: SeasonRecordErrors = {};
  const notes = values.notes.trim();

  if (!season || values.seasonId !== season.id) {
    errors.seasonId = "기록을 저장할 시즌을 찾을 수 없습니다.";
  }
  if (!isSeasonRecordType(values.type)) {
    errors.type = "기록 종류를 확인해 주세요.";
  }
  if (!isValidDateOnly(values.recordedOn)) {
    errors.recordedOn = "올바른 기록 날짜를 입력해 주세요.";
  } else if (
    season &&
    (values.recordedOn < season.startDate || values.recordedOn > season.endDate)
  ) {
    errors.recordedOn = "기록 날짜는 시즌 기간 안에 있어야 합니다.";
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `기록 내용은 ${MAX_NOTES_LENGTH}자 이하로 입력해 주세요.`;
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      seasonId: values.seasonId,
      type: values.type,
      recordedOn: values.recordedOn,
      notes,
    },
  };
}

export function createSeasonRecord(
  input: SeasonRecordInput,
  id: string,
  createdAt: string,
): SeasonRecord {
  return { ...input, id, createdAt };
}

export function getSeasonRecords(
  records: readonly SeasonRecord[],
  seasonId: string,
): SeasonRecord[] {
  return records
    .filter((record) => record.seasonId === seasonId)
    .sort(
      (left, right) =>
        right.recordedOn.localeCompare(left.recordedOn) ||
        right.createdAt.localeCompare(left.createdAt),
    );
}

export function isSeasonRecordType(value: unknown): value is SeasonRecordType {
  return (
    typeof value === "string" &&
    SEASON_RECORD_TYPES.some((type) => type === value)
  );
}

export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}
