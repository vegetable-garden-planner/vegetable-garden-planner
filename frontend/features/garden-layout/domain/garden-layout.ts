export const GRID_CELL_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const MAX_GRID_CELLS = 400;

export type GridCellSizeCm = (typeof GRID_CELL_SIZE_OPTIONS)[number];

export interface CropPlacement {
  cellIndex: number;
  cropId: string;
}

export interface GardenLayout {
  seasonId: string;
  spaceId: string;
  spaceWidthCm: number;
  spaceLengthCm: number;
  cellSizeCm: GridCellSizeCm;
  columns: number;
  rows: number;
  placements: readonly CropPlacement[];
  updatedAt: string;
  version?: number;
}

export type GardenLayoutCreation =
  | { valid: true; layout: GardenLayout }
  | { valid: false; message: string };

export class InvalidCropPlacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCropPlacementError";
  }
}

export function createGardenLayout(
  seasonId: string,
  spaceId: string,
  spaceWidthCm: number,
  spaceLengthCm: number,
  cellSizeCm: GridCellSizeCm,
  updatedAt: string,
): GardenLayoutCreation {
  if (!seasonId || !spaceId) {
    return { valid: false, message: "연결된 시즌과 재배 공간이 필요합니다." };
  }
  if (!isPositiveFinite(spaceWidthCm) || !isPositiveFinite(spaceLengthCm)) {
    return { valid: false, message: "재배 공간 크기가 올바르지 않습니다." };
  }

  const columns = Math.floor(spaceWidthCm / cellSizeCm);
  const rows = Math.floor(spaceLengthCm / cellSizeCm);
  if (columns < 1 || rows < 1) {
    return { valid: false, message: "선택한 칸 크기보다 재배 공간이 작습니다." };
  }
  if (columns * rows > MAX_GRID_CELLS) {
    return {
      valid: false,
      message: `격자는 최대 ${MAX_GRID_CELLS}칸까지 만들 수 있습니다. 칸 크기를 늘려 주세요.`,
    };
  }

  return {
    valid: true,
    layout: {
      seasonId,
      spaceId,
      spaceWidthCm,
      spaceLengthCm,
      cellSizeCm,
      columns,
      rows,
      placements: [],
      updatedAt,
    },
  };
}

export function toggleCropPlacement(
  layout: GardenLayout,
  cellIndex: number,
  cropId: string,
  registeredCropIds: readonly string[],
  updatedAt: string,
): GardenLayout {
  const cellCount = layout.columns * layout.rows;
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= cellCount) {
    throw new InvalidCropPlacementError("배치할 격자 칸을 찾을 수 없습니다.");
  }
  if (!registeredCropIds.includes(cropId)) {
    throw new InvalidCropPlacementError("등록된 작물을 선택해 주세요.");
  }

  const current = layout.placements.find(
    (placement) => placement.cellIndex === cellIndex,
  );
  const remaining = layout.placements.filter(
    (placement) => placement.cellIndex !== cellIndex,
  );
  const placements = current?.cropId === cropId
    ? remaining
    : [...remaining, { cellIndex, cropId }].sort(
        (left, right) => left.cellIndex - right.cellIndex,
      );

  return { ...layout, placements, updatedAt };
}

export function isGardenLayoutOutdated(
  layout: GardenLayout,
  space: { id: string; widthCm: number; lengthCm: number },
) {
  return layout.spaceId !== space.id
    || layout.spaceWidthCm !== space.widthCm
    || layout.spaceLengthCm !== space.lengthCm;
}

function isPositiveFinite(value: number) {
  return Number.isFinite(value) && value > 0;
}
