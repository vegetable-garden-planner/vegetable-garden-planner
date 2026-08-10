export interface WateringRule {
  cropId: string;
  growthStage: string;
  intervalDays: number;
  guideText: string;
}

export interface WateringSchedule {
  id: string;
  plantingId: string;
  intervalDays: number;
  nextWateringAt: string;
  enabled: boolean;
  updatedAt: string;
}

export interface WateringLog {
  id: string;
  plantingId: string;
  userId: string;
  scheduledFor: string;
  wateredAt: string;
  amountMl: number | null;
  memo: string;
}

export interface WateringSnooze {
  id: string;
  scheduleId: string;
  originalDate: string;
  snoozedUntil: string;
}

export type WateringScheduleStatus =
  | "disabled"
  | "upcoming"
  | "due"
  | "overdue";

export interface WateringScheduleInput {
  id: string;
  plantingId: string;
  cropId: string;
  growthStage: string;
  firstWateringAt: string;
  updatedAt: string;
}

export interface WateringCompletionInput {
  id: string;
  userId: string;
  wateredAt: string;
  amountMl?: number | null;
  memo: string;
}

export interface WateringSnoozeInput {
  id: string;
  snoozedUntil: string;
  updatedAt: string;
}

export class InvalidWateringDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWateringDataError";
  }
}

const DEFAULT_GROWTH_STAGE = "default";
const DEFAULT_WATERING_TIME_ZONE = "Asia/Seoul";
const MAX_INTERVAL_DAYS = 365;
const MAX_MEMO_LENGTH = 500;

export function selectWateringRule(
  rules: readonly WateringRule[],
  cropId: string,
  growthStage: string,
): WateringRule {
  const matchingRules = rules.filter((rule) => rule.cropId === cropId);
  if (!matchingRules.every(isWateringRule)) {
    throw new InvalidWateringDataError("물주기 규칙이 올바르지 않습니다.");
  }

  const growthStages = new Set<string>();
  for (const matchingRule of matchingRules) {
    if (growthStages.has(matchingRule.growthStage)) {
      throw new InvalidWateringDataError(
        "같은 작물과 생육 단계의 물주기 규칙이 중복되었습니다.",
      );
    }
    growthStages.add(matchingRule.growthStage);
  }

  const rule = matchingRules.find((candidate) =>
    candidate.growthStage === growthStage)
    ?? matchingRules.find((candidate) =>
      candidate.growthStage === DEFAULT_GROWTH_STAGE);

  if (!rule || !isWateringRule(rule)) {
    throw new InvalidWateringDataError("적용할 물주기 규칙을 찾을 수 없습니다.");
  }
  return rule;
}

export function createWateringSchedule(
  input: WateringScheduleInput,
  rules: readonly WateringRule[],
): WateringSchedule {
  assertNonEmpty(input.id, "물주기 일정 ID");
  assertNonEmpty(input.plantingId, "재배 ID");
  assertIsoDateTime(input.firstWateringAt, "첫 물주기 시각");
  assertIsoDateTime(input.updatedAt, "수정 시각");

  const rule = selectWateringRule(rules, input.cropId, input.growthStage);
  return {
    id: input.id,
    plantingId: input.plantingId,
    intervalDays: rule.intervalDays,
    nextWateringAt: input.firstWateringAt,
    enabled: true,
    updatedAt: input.updatedAt,
  };
}

export function getWateringScheduleStatus(
  schedule: WateringSchedule,
  now: string,
  timeZone = DEFAULT_WATERING_TIME_ZONE,
): WateringScheduleStatus {
  if (!isWateringSchedule(schedule)) {
    throw new InvalidWateringDataError("물주기 일정이 올바르지 않습니다.");
  }
  assertIsoDateTime(now, "기준 시각");
  if (!schedule.enabled) return "disabled";

  const dueDate = getDateOnlyInTimeZone(schedule.nextWateringAt, timeZone);
  const currentDate = getDateOnlyInTimeZone(now, timeZone);
  if (currentDate < dueDate) return "upcoming";
  if (currentDate === dueDate) return "due";
  return "overdue";
}

export function completeWatering(
  schedule: WateringSchedule,
  input: WateringCompletionInput,
): { schedule: WateringSchedule; log: WateringLog } {
  assertUsableSchedule(schedule);
  assertNonEmpty(input.id, "물주기 기록 ID");
  assertNonEmpty(input.userId, "사용자 ID");
  assertIsoDateTime(input.wateredAt, "완료 시각");

  const amountMl = input.amountMl ?? null;
  if (amountMl !== null && (!Number.isFinite(amountMl) || amountMl <= 0)) {
    throw new InvalidWateringDataError("물의 양은 0보다 큰 숫자여야 합니다.");
  }
  const memo = input.memo.trim();
  if (memo.length > MAX_MEMO_LENGTH) {
    throw new InvalidWateringDataError(
      `물주기 메모는 ${MAX_MEMO_LENGTH}자 이하여야 합니다.`,
    );
  }

  const log: WateringLog = {
    id: input.id,
    plantingId: schedule.plantingId,
    userId: input.userId,
    scheduledFor: schedule.nextWateringAt,
    wateredAt: input.wateredAt,
    amountMl,
    memo,
  };
  return {
    log,
    schedule: {
      ...schedule,
      nextWateringAt: addUtcDays(input.wateredAt, schedule.intervalDays),
      updatedAt: input.wateredAt,
    },
  };
}

export function reopenWatering(
  schedule: WateringSchedule,
  log: WateringLog,
  updatedAt: string,
): WateringSchedule {
  if (!isWateringSchedule(schedule) || !isWateringLog(log)) {
    throw new InvalidWateringDataError("복원할 물주기 데이터가 올바르지 않습니다.");
  }
  if (schedule.plantingId !== log.plantingId) {
    throw new InvalidWateringDataError("일정과 물주기 기록의 재배 정보가 다릅니다.");
  }
  assertIsoDateTime(updatedAt, "수정 시각");

  return {
    ...schedule,
    nextWateringAt: log.scheduledFor,
    updatedAt,
  };
}

export function snoozeWatering(
  schedule: WateringSchedule,
  input: WateringSnoozeInput,
): { schedule: WateringSchedule; snooze: WateringSnooze } {
  assertUsableSchedule(schedule);
  assertNonEmpty(input.id, "물주기 연기 ID");
  assertIsoDateTime(input.snoozedUntil, "연기 시각");
  assertIsoDateTime(input.updatedAt, "수정 시각");
  if (input.snoozedUntil <= schedule.nextWateringAt) {
    throw new InvalidWateringDataError(
      "물주기 연기 시각은 현재 예정 시각보다 늦어야 합니다.",
    );
  }

  return {
    snooze: {
      id: input.id,
      scheduleId: schedule.id,
      originalDate: schedule.nextWateringAt,
      snoozedUntil: input.snoozedUntil,
    },
    schedule: {
      ...schedule,
      nextWateringAt: input.snoozedUntil,
      updatedAt: input.updatedAt,
    },
  };
}

export function setWateringScheduleEnabled(
  schedule: WateringSchedule,
  enabled: boolean,
  updatedAt: string,
): WateringSchedule {
  if (!isWateringSchedule(schedule)) {
    throw new InvalidWateringDataError("물주기 일정이 올바르지 않습니다.");
  }
  assertIsoDateTime(updatedAt, "수정 시각");
  return { ...schedule, enabled, updatedAt };
}

export function isWateringRule(value: unknown): value is WateringRule {
  return isRecord(value)
    && isNonEmptyString(value.cropId)
    && isNonEmptyString(value.growthStage)
    && isValidInterval(value.intervalDays)
    && typeof value.guideText === "string";
}

export function isWateringSchedule(value: unknown): value is WateringSchedule {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.plantingId)
    && isValidInterval(value.intervalDays)
    && isIsoDateTime(value.nextWateringAt)
    && typeof value.enabled === "boolean"
    && isIsoDateTime(value.updatedAt);
}

export function isWateringLog(value: unknown): value is WateringLog {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.plantingId)
    && isNonEmptyString(value.userId)
    && isIsoDateTime(value.scheduledFor)
    && isIsoDateTime(value.wateredAt)
    && (value.amountMl === null
      || (typeof value.amountMl === "number"
        && Number.isFinite(value.amountMl)
        && value.amountMl > 0))
    && typeof value.memo === "string"
    && value.memo.length <= MAX_MEMO_LENGTH;
}

export function isWateringSnooze(value: unknown): value is WateringSnooze {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.scheduleId)
    && isIsoDateTime(value.originalDate)
    && isIsoDateTime(value.snoozedUntil)
    && value.snoozedUntil > value.originalDate;
}

function assertUsableSchedule(schedule: WateringSchedule) {
  if (!isWateringSchedule(schedule)) {
    throw new InvalidWateringDataError("물주기 일정이 올바르지 않습니다.");
  }
  if (!schedule.enabled) {
    throw new InvalidWateringDataError("비활성화된 물주기 일정입니다.");
  }
}

function assertNonEmpty(value: string, label: string) {
  if (!isNonEmptyString(value)) {
    throw new InvalidWateringDataError(`${label}이 필요합니다.`);
  }
}

function assertIsoDateTime(value: string, label: string) {
  if (!isIsoDateTime(value)) {
    throw new InvalidWateringDataError(`${label}이 올바르지 않습니다.`);
  }
}

function addUtcDays(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function getDateOnlyInTimeZone(value: string, timeZone: string) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    throw new InvalidWateringDataError("물주기 기준 시간대가 올바르지 않습니다.");
  }

  const parts = new Map(
    formatter
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  const year = parts.get("year");
  const month = parts.get("month");
  const day = parts.get("day");
  if (!year || !month || !day) {
    throw new InvalidWateringDataError("물주기 날짜를 계산할 수 없습니다.");
  }
  return `${year}-${month}-${day}`;
}

function isValidInterval(value: unknown) {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= 1
    && value <= MAX_INTERVAL_DAYS;
}

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
