import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import type { KeyValueStorage } from "@/shared/infrastructure/key-value-storage";
import {
  isGrowingSpaceType,
  isSunlightExposure,
} from "../../../shared/domain/growing-environment.ts";

const STORAGE_KEY = "simeobom:growing-spaces";

export class InvalidGrowingSpaceDataError extends Error {
  constructor() {
    super("저장된 재배 공간 데이터를 읽을 수 없습니다.");
    this.name = "InvalidGrowingSpaceDataError";
  }
}

export function loadGrowingSpaces(storage: KeyValueStorage): GrowingSpace[] {
  return parseGrowingSpacesSnapshot(getGrowingSpacesSnapshot(storage));
}

export function getGrowingSpacesSnapshot(storage: KeyValueStorage): string {
  return storage.getItem(STORAGE_KEY) ?? "";
}

export function parseGrowingSpacesSnapshot(stored: string): GrowingSpace[] {

  if (!stored) {
    return [];
  }

  const parsed: unknown = JSON.parse(stored);
  if (!isGrowingSpaceList(parsed)) {
    throw new InvalidGrowingSpaceDataError();
  }

  return parsed;
}

export function addGrowingSpace(
  storage: KeyValueStorage,
  space: GrowingSpace,
) {
  const current = loadGrowingSpaces(storage);
  storage.setItem(STORAGE_KEY, JSON.stringify([...current, space]));
}

function isGrowingSpaceList(value: unknown): value is GrowingSpace[] {
  return Array.isArray(value) && value.every(isGrowingSpace);
}

function isGrowingSpace(value: unknown): value is GrowingSpace {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.type === "string"
    && isGrowingSpaceType(value.type)
    && typeof value.sunlight === "string"
    && isSunlightExposure(value.sunlight)
    && typeof value.widthCm === "number"
    && typeof value.lengthCm === "number"
    && typeof value.region === "string"
    && typeof value.notes === "string"
    && typeof value.createdAt === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
