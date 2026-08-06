import type { GardenLayout } from "../domain/garden-layout.ts";
import { GRID_CELL_SIZE_OPTIONS } from "../domain/garden-layout.ts";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";

export const GARDEN_LAYOUTS_STORAGE_KEY = "simeobom:garden-layouts";

export class InvalidGardenLayoutDataError extends Error {
  constructor() {
    super("저장된 텃밭 격자 데이터를 읽을 수 없습니다.");
    this.name = "InvalidGardenLayoutDataError";
  }
}

export function getGardenLayoutsSnapshot(storage: KeyValueStorage) {
  return storage.getItem(GARDEN_LAYOUTS_STORAGE_KEY) ?? "";
}

export function parseGardenLayoutsSnapshot(snapshot: string): GardenLayout[] {
  if (!snapshot) return [];

  const parsed: unknown = JSON.parse(snapshot);
  if (!Array.isArray(parsed) || !parsed.every(isGardenLayout)) {
    throw new InvalidGardenLayoutDataError();
  }
  return parsed;
}

export function loadGardenLayouts(storage: KeyValueStorage) {
  return parseGardenLayoutsSnapshot(getGardenLayoutsSnapshot(storage));
}

export function saveGardenLayout(
  storage: KeyValueStorage,
  layout: GardenLayout,
) {
  const current = loadGardenLayouts(storage);
  const remaining = current.filter((item) => item.seasonId !== layout.seasonId);
  storage.setItem(
    GARDEN_LAYOUTS_STORAGE_KEY,
    JSON.stringify([...remaining, layout]),
  );
}

export function deleteGardenLayout(storage: KeyValueStorage, seasonId: string) {
  const current = loadGardenLayouts(storage);
  const remaining = current.filter((layout) => layout.seasonId !== seasonId);
  if (remaining.length === current.length) {
    throw new Error("삭제할 텃밭 격자를 찾을 수 없습니다.");
  }
  storage.setItem(GARDEN_LAYOUTS_STORAGE_KEY, JSON.stringify(remaining));
}

function isGardenLayout(value: unknown): value is GardenLayout {
  if (!isRecord(value) || !Array.isArray(value.placements)) return false;

  const cellCount = Number(value.columns) * Number(value.rows);
  const cellIndexes = new Set<number>();
  return typeof value.seasonId === "string"
    && typeof value.spaceId === "string"
    && typeof value.spaceWidthCm === "number"
    && typeof value.spaceLengthCm === "number"
    && typeof value.cellSizeCm === "number"
    && GRID_CELL_SIZE_OPTIONS.some((option) => option === value.cellSizeCm)
    && Number.isInteger(value.columns)
    && Number(value.columns) > 0
    && Number.isInteger(value.rows)
    && Number(value.rows) > 0
    && typeof value.updatedAt === "string"
    && value.placements.every((placement) => {
      if (!isCropPlacement(placement, cellCount)) return false;
      if (cellIndexes.has(placement.cellIndex)) return false;
      cellIndexes.add(placement.cellIndex);
      return true;
    });
}

function isCropPlacement(value: unknown, cellCount: number) {
  if (!isRecord(value)) return false;
  return Number.isInteger(value.cellIndex)
    && Number(value.cellIndex) >= 0
    && Number(value.cellIndex) < cellCount
    && typeof value.cropId === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
