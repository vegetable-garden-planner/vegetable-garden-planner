import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import {
  completeWatering,
  isWateringLog,
  isWateringSchedule,
  isWateringSnooze,
  reopenWatering,
  setWateringScheduleEnabled,
  snoozeWatering,
  type WateringCompletionInput,
  type WateringLog,
  type WateringSchedule,
  type WateringSnooze,
  type WateringSnoozeInput,
} from "../domain/watering.ts";

export const WATERING_STORAGE_KEY = "simeobom:watering";

export interface WateringData {
  schedules: WateringSchedule[];
  logs: WateringLog[];
  snoozes: WateringSnooze[];
}

export class InvalidWateringStorageDataError extends Error {
  constructor() {
    super("저장된 물주기 데이터를 읽을 수 없습니다.");
    this.name = "InvalidWateringStorageDataError";
  }
}

export function getWateringDataSnapshot(storage: KeyValueStorage): string {
  return storage.getItem(WATERING_STORAGE_KEY) ?? "";
}

export function parseWateringDataSnapshot(snapshot: string): WateringData {
  if (!snapshot) return emptyWateringData();

  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new InvalidWateringStorageDataError();
  }

  if (!isWateringData(parsed)) {
    throw new InvalidWateringStorageDataError();
  }
  return parsed;
}

export function loadWateringData(storage: KeyValueStorage): WateringData {
  return parseWateringDataSnapshot(getWateringDataSnapshot(storage));
}

export function saveWateringSchedule(
  storage: KeyValueStorage,
  schedule: WateringSchedule,
) {
  if (!isWateringSchedule(schedule)) {
    throw new InvalidWateringStorageDataError();
  }

  const current = loadWateringData(storage);
  const plantingConflict = current.schedules.some((candidate) =>
    candidate.plantingId === schedule.plantingId
    && candidate.id !== schedule.id);
  if (plantingConflict) {
    throw new Error("해당 재배에는 이미 물주기 일정이 있습니다.");
  }

  const remaining = current.schedules.filter((item) => item.id !== schedule.id);
  saveWateringData(storage, {
    ...current,
    schedules: [...remaining, schedule],
  });
}

export function completeStoredWatering(
  storage: KeyValueStorage,
  scheduleId: string,
  input: WateringCompletionInput,
) {
  const current = loadWateringData(storage);
  if (current.logs.some((log) => log.id === input.id)) {
    throw new Error("이미 저장된 물주기 기록 ID입니다.");
  }

  const schedule = requireSchedule(current.schedules, scheduleId);
  const completed = completeWatering(schedule, input);
  saveWateringData(storage, {
    ...current,
    schedules: replaceSchedule(current.schedules, completed.schedule),
    logs: [...current.logs, completed.log],
  });
  return completed;
}

export function reopenStoredWatering(
  storage: KeyValueStorage,
  logId: string,
  updatedAt: string,
): WateringSchedule {
  const current = loadWateringData(storage);
  const log = current.logs.find((candidate) => candidate.id === logId);
  if (!log) {
    throw new Error("완료 취소할 물주기 기록을 찾을 수 없습니다.");
  }

  const latestLog = findLatestPlantingLog(current.logs, log.plantingId);
  if (latestLog?.id !== log.id) {
    throw new Error("가장 최근 물주기 기록부터 완료 취소할 수 있습니다.");
  }

  const schedule = current.schedules.find((candidate) =>
    candidate.plantingId === log.plantingId);
  if (!schedule) {
    throw new InvalidWateringStorageDataError();
  }

  const reopened = reopenWatering(schedule, log, updatedAt);
  saveWateringData(storage, {
    ...current,
    schedules: replaceSchedule(current.schedules, reopened),
    logs: current.logs.filter((candidate) => candidate.id !== logId),
  });
  return reopened;
}

export function snoozeStoredWatering(
  storage: KeyValueStorage,
  scheduleId: string,
  input: WateringSnoozeInput,
) {
  const current = loadWateringData(storage);
  if (current.snoozes.some((snooze) => snooze.id === input.id)) {
    throw new Error("이미 저장된 물주기 연기 ID입니다.");
  }

  const schedule = requireSchedule(current.schedules, scheduleId);
  const snoozed = snoozeWatering(schedule, input);
  saveWateringData(storage, {
    ...current,
    schedules: replaceSchedule(current.schedules, snoozed.schedule),
    snoozes: [...current.snoozes, snoozed.snooze],
  });
  return snoozed;
}

export function setStoredWateringScheduleEnabled(
  storage: KeyValueStorage,
  scheduleId: string,
  enabled: boolean,
  updatedAt: string,
): WateringSchedule {
  const current = loadWateringData(storage);
  const schedule = requireSchedule(current.schedules, scheduleId);
  const updated = setWateringScheduleEnabled(schedule, enabled, updatedAt);
  saveWateringData(storage, {
    ...current,
    schedules: replaceSchedule(current.schedules, updated),
  });
  return updated;
}

function emptyWateringData(): WateringData {
  return { schedules: [], logs: [], snoozes: [] };
}

function saveWateringData(storage: KeyValueStorage, data: WateringData) {
  if (!isWateringData(data)) {
    throw new InvalidWateringStorageDataError();
  }
  storage.setItem(WATERING_STORAGE_KEY, JSON.stringify(data));
}

function requireSchedule(
  schedules: readonly WateringSchedule[],
  scheduleId: string,
): WateringSchedule {
  const schedule = schedules.find((candidate) => candidate.id === scheduleId);
  if (!schedule) {
    throw new Error("물주기 일정을 찾을 수 없습니다.");
  }
  return schedule;
}

function replaceSchedule(
  schedules: readonly WateringSchedule[],
  updated: WateringSchedule,
) {
  return schedules.map((schedule) =>
    schedule.id === updated.id ? updated : schedule);
}

function findLatestPlantingLog(
  logs: readonly WateringLog[],
  plantingId: string,
) {
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    if (logs[index]?.plantingId === plantingId) return logs[index];
  }
  return undefined;
}

function isWateringData(value: unknown): value is WateringData {
  if (
    !isRecord(value)
    || !Array.isArray(value.schedules)
    || !Array.isArray(value.logs)
    || !Array.isArray(value.snoozes)
    || !value.schedules.every(isWateringSchedule)
    || !value.logs.every(isWateringLog)
    || !value.snoozes.every(isWateringSnooze)
  ) {
    return false;
  }

  const scheduleIds = new Set<string>();
  const plantingIds = new Set<string>();
  for (const schedule of value.schedules) {
    if (scheduleIds.has(schedule.id) || plantingIds.has(schedule.plantingId)) {
      return false;
    }
    scheduleIds.add(schedule.id);
    plantingIds.add(schedule.plantingId);
  }

  const logIds = new Set<string>();
  for (const log of value.logs) {
    if (logIds.has(log.id) || !plantingIds.has(log.plantingId)) return false;
    logIds.add(log.id);
  }

  const snoozeIds = new Set<string>();
  for (const snooze of value.snoozes) {
    if (snoozeIds.has(snooze.id) || !scheduleIds.has(snooze.scheduleId)) {
      return false;
    }
    snoozeIds.add(snooze.id);
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
