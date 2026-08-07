import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import {
  CULTIVATION_TASK_TYPES,
  type CultivationTask,
} from "../domain/cultivation-task.ts";

export const CULTIVATION_TASKS_STORAGE_KEY = "simeobom:cultivation-tasks";

export class InvalidCultivationTaskDataError extends Error {
  constructor() {
    super("저장된 재배 일정 데이터를 읽을 수 없습니다.");
    this.name = "InvalidCultivationTaskDataError";
  }
}

export function getCultivationTasksSnapshot(storage: KeyValueStorage) {
  return storage.getItem(CULTIVATION_TASKS_STORAGE_KEY) ?? "";
}

export function parseCultivationTasksSnapshot(snapshot: string): CultivationTask[] {
  if (!snapshot) return [];

  const parsed: unknown = JSON.parse(snapshot);
  if (!isCultivationTaskList(parsed)) {
    throw new InvalidCultivationTaskDataError();
  }
  return parsed;
}

export function loadCultivationTasks(storage: KeyValueStorage) {
  return parseCultivationTasksSnapshot(getCultivationTasksSnapshot(storage));
}

export function saveSeasonCultivationTasks(
  storage: KeyValueStorage,
  seasonId: string,
  tasks: readonly CultivationTask[],
) {
  if (tasks.some((task) => task.seasonId !== seasonId)) {
    throw new Error("다른 시즌의 일정은 함께 저장할 수 없습니다.");
  }

  const current = loadCultivationTasks(storage);
  const otherSeasons = current.filter((task) => task.seasonId !== seasonId);
  storage.setItem(
    CULTIVATION_TASKS_STORAGE_KEY,
    JSON.stringify([...otherSeasons, ...tasks]),
  );
}

function isCultivationTaskList(value: unknown): value is CultivationTask[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();

  return value.every((task) => {
    if (!isCultivationTask(task) || ids.has(task.id)) return false;
    ids.add(task.id);
    return true;
  });
}

function isCultivationTask(value: unknown): value is CultivationTask {
  if (!isRecord(value)) return false;

  return typeof value.id === "string"
    && typeof value.seasonId === "string"
    && typeof value.cropId === "string"
    && typeof value.type === "string"
    && CULTIVATION_TASK_TYPES.some((type) => type === value.type)
    && typeof value.title === "string"
    && isDateOnly(value.dueDate)
    && typeof value.notes === "string"
    && (value.status === "pending" || value.status === "completed")
    && (value.completedAt === null || typeof value.completedAt === "string")
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string";
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
