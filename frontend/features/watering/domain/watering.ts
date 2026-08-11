import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season.ts";

export interface WateringSchedule {
  id: string;
  seasonId: string;
  cropId: string;
  intervalDays: number;
  nextWateringAt: string;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WateringLog {
  id: string;
  scheduleId: string;
  userId: string;
  scheduledFor: string;
  wateredAt: string;
  amountMl: number | null;
  memo: string;
  createdAt: string;
}

export interface WateringSnooze {
  id: string;
  scheduleId: string;
  originalAt: string;
  snoozedUntil: string;
  createdAt: string;
}

export interface WateringScheduleInput {
  cropId: string;
  intervalDays: number;
  nextWateringAt: string;
  enabled: boolean;
}

export type WateringScheduleUpdate = Partial<
  Pick<WateringSchedule, "intervalDays" | "nextWateringAt" | "enabled">
>;

export interface CompleteWateringInput {
  wateredAt: string;
  amountMl: number | null;
  memo: string | null;
}

export interface WateringHistory {
  logs: WateringLog[];
  snoozes: WateringSnooze[];
}

export type WateringScheduleStatus = "disabled" | "overdue" | "today" | "upcoming";

export interface WateringScheduleDraft {
  cropId: string;
  intervalDays: string;
  nextWateringAtLocal: string;
}

export type WateringScheduleDraftValidation =
  | { valid: true; value: WateringScheduleInput }
  | { valid: false; errors: Partial<Record<keyof WateringScheduleDraft, string>> };

export function getWateringScheduleStatus(
  schedule: WateringSchedule,
  now: Date,
): WateringScheduleStatus {
  if (!schedule.enabled) return "disabled";

  const nextTimestamp = Date.parse(schedule.nextWateringAt);
  if (!Number.isFinite(nextTimestamp) || !Number.isFinite(now.getTime())) {
    throw new Error("물주기 예정 시각이 올바르지 않습니다.");
  }

  const nextDate = toLocalDateKey(new Date(nextTimestamp));
  const today = toLocalDateKey(now);
  if (nextDate < today) return "overdue";
  if (nextDate === today) return "today";
  return "upcoming";
}

export function validateWateringScheduleDraft(
  draft: WateringScheduleDraft,
  season: Pick<PersistedGrowingSeason, "startDate" | "endDate">,
): WateringScheduleDraftValidation {
  const errors: Partial<Record<keyof WateringScheduleDraft, string>> = {};
  const intervalDays = Number(draft.intervalDays);
  const localDate = draft.nextWateringAtLocal.slice(0, 10);

  if (!draft.cropId) errors.cropId = "배치된 작물을 선택해 주세요.";
  if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365) {
    errors.intervalDays = "반복 간격은 1일 이상 365일 이하로 입력해 주세요.";
  }
  if (!isLocalDateTime(draft.nextWateringAtLocal)) {
    errors.nextWateringAtLocal = "올바른 첫 물주기 시각을 입력해 주세요.";
  } else if (localDate < season.startDate || localDate > season.endDate) {
    errors.nextWateringAtLocal = "첫 물주기 시각은 재배 시즌 안이어야 합니다.";
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    value: {
      cropId: draft.cropId,
      intervalDays,
      nextWateringAt: localDateTimeToOffsetIso(draft.nextWateringAtLocal),
      enabled: true,
    },
  };
}

export function localDateTimeToOffsetIso(
  value: string,
  timezoneOffsetMinutes?: number,
): string {
  if (!isLocalDateTime(value)) throw new Error("올바른 날짜와 시각을 입력해 주세요.");
  const localDate = new Date(value);
  const offset = timezoneOffsetMinutes ?? localDate.getTimezoneOffset();
  const sign = offset <= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offset);
  const hours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const minutes = String(absoluteOffset % 60).padStart(2, "0");

  return `${value}:00${sign}${hours}:${minutes}`;
}

export function toLocalDateTimeInput(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error("올바른 날짜가 필요합니다.");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isLocalDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  return toLocalDateTimeInput(parsed) === value;
}

function toLocalDateKey(date: Date): string {
  return toLocalDateTimeInput(date).slice(0, 10);
}
