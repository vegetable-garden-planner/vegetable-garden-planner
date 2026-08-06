import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import type { GrowingSeason } from "../domain/growing-season.ts";

export const GROWING_SEASONS_STORAGE_KEY = "simeobom:growing-seasons";

export class InvalidGrowingSeasonDataError extends Error {
  constructor() {
    super("저장된 시즌 데이터를 읽을 수 없습니다.");
    this.name = "InvalidGrowingSeasonDataError";
  }
}

export function getGrowingSeasonsSnapshot(storage: KeyValueStorage): string {
  return storage.getItem(GROWING_SEASONS_STORAGE_KEY) ?? "";
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
  saveGrowingSeasons(storage, [...current, season]);
}

export function updateGrowingSeason(
  storage: KeyValueStorage,
  season: GrowingSeason,
) {
  const current = loadGrowingSeasons(storage);
  const index = current.findIndex((item) => item.id === season.id);
  if (index < 0) {
    throw new Error("수정할 시즌을 찾을 수 없습니다.");
  }

  const next = [...current];
  next[index] = season;
  saveGrowingSeasons(storage, next);
}

export function deleteGrowingSeason(storage: KeyValueStorage, seasonId: string) {
  const current = loadGrowingSeasons(storage);
  if (!current.some((season) => season.id === seasonId)) {
    throw new Error("삭제할 시즌을 찾을 수 없습니다.");
  }

  saveGrowingSeasons(storage, current.filter((season) => season.id !== seasonId));
}

function saveGrowingSeasons(
  storage: KeyValueStorage,
  seasons: readonly GrowingSeason[],
) {
  storage.setItem(GROWING_SEASONS_STORAGE_KEY, JSON.stringify(seasons));
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
