import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import type { GrowingSeason } from "../domain/growing-season.ts";

const SEASON_STORAGE_KEY = "simeobom:growing-seasons";

export class InvalidGrowingSeasonDataError extends Error {
  constructor() {
    super("저장된 시즌 데이터를 읽을 수 없습니다.");
    this.name = "InvalidGrowingSeasonDataError";
  }
}

export function getGrowingSeasonsSnapshot(storage: KeyValueStorage): string {
  return storage.getItem(SEASON_STORAGE_KEY) ?? "";
}

export function parseGrowingSeasonsSnapshot(snapshot: string): GrowingSeason[] {
  if (!snapshot) {
    return [];
  }

  const parsed: unknown = JSON.parse(snapshot);
  if (!isGrowingSeasonList(parsed)) {
    throw new InvalidGrowingSeasonDataError();
  }

  return parsed;
}

export function loadGrowingSeasons(storage: KeyValueStorage): GrowingSeason[] {
  return parseGrowingSeasonsSnapshot(getGrowingSeasonsSnapshot(storage));
}

export function addGrowingSeason(
  storage: KeyValueStorage,
  season: GrowingSeason,
) {
  const current = loadGrowingSeasons(storage);
  storage.setItem(SEASON_STORAGE_KEY, JSON.stringify([...current, season]));
}

function isGrowingSeasonList(value: unknown): value is GrowingSeason[] {
  return Array.isArray(value) && value.every(isGrowingSeason);
}

function isGrowingSeason(value: unknown): value is GrowingSeason {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === "string"
    && typeof value.spaceId === "string"
    && typeof value.name === "string"
    && typeof value.startDate === "string"
    && typeof value.endDate === "string"
    && typeof value.notes === "string"
    && typeof value.createdAt === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
