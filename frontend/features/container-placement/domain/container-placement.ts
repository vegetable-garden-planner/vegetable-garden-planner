export interface ContainerPlacement {
  id: string;
  spaceId: string;
  cropId: string;
  quantity: number;
  position: unknown;
}

export interface ContainerPlacements {
  seasonId: string;
  placements: ContainerPlacement[];
  version: number;
}

export interface ContainerPlacementListItem {
  id: string;
  seasonId: string;
  spaceId: string;
  cropId: string;
  quantity: number;
  position: unknown;
}

export interface ContainerPlacementRow {
  key: string;
  spaceId: string;
  cropId: string;
  quantity: number;
}

export interface ContainerPlacementInput {
  spaceId: string;
  cropId: string;
  quantity: number;
  position: unknown;
}

export const MAX_QUANTITY = 500;

/**
 * 서버는 저장 순서를 보장하지 않으므로(id 정렬), 화면에서 보여준 순서를
 * position.order로 저장해 두고 그 값으로 다시 정렬합니다.
 */
export function toEditableRows(placements: readonly ContainerPlacement[]): ContainerPlacementRow[] {
  return [...placements]
    .sort((a, b) => placementOrder(a) - placementOrder(b))
    .map((placement, index) => ({
      key: `saved-${placement.id}-${index}`,
      spaceId: placement.spaceId,
      cropId: placement.cropId,
      quantity: placement.quantity,
    }));
}

export function toPlacementInputs(rows: readonly ContainerPlacementRow[]): ContainerPlacementInput[] {
  return rows.map((row, index) => ({
    spaceId: row.spaceId,
    cropId: row.cropId,
    quantity: row.quantity,
    position: { order: index },
  }));
}

export function validatePlacementRows(rows: readonly ContainerPlacementRow[]): string {
  for (const row of rows) {
    if (!row.spaceId) return "각 항목에 화분을 선택해 주세요.";
    if (!row.cropId) return "각 항목에 작물을 선택해 주세요.";
    if (!Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > MAX_QUANTITY) {
      return `수량은 1~${MAX_QUANTITY} 사이로 입력해 주세요.`;
    }
  }
  return "";
}

/** 아직 화분에 안 넣은(미배정) 채소인지 — 배치 캔버스의 "선택한 채소" 풀에 남는다. */
export function isPlacedRow(row: Pick<ContainerPlacementRow, "spaceId">): boolean {
  return row.spaceId !== "";
}

export interface PlaceableCrop {
  id: string;
  supportedSpaces: readonly string[];
}

export interface PlaceableSpace {
  id: string;
  type: string;
}

/**
 * 미배정 채소만 호환되는 화분에 순서대로(라운드로빈) 채워 넣는다.
 * 이미 화분에 배치된 항목은 건드리지 않는다.
 */
export function autoPlaceRows(
  rows: readonly ContainerPlacementRow[],
  crops: readonly PlaceableCrop[],
  spaces: readonly PlaceableSpace[],
): ContainerPlacementRow[] {
  let cursor = 0;
  return rows.map((row) => {
    if (isPlacedRow(row)) return row;

    const crop = crops.find((item) => item.id === row.cropId);
    const compatible = crop ? spaces.filter((space) => crop.supportedSpaces.includes(space.type)) : [];
    if (compatible.length === 0) return row;

    const target = compatible[cursor % compatible.length];
    cursor += 1;
    return { ...row, spaceId: target.id };
  });
}

export function canPlaceCropInSpace(crop: PlaceableCrop, space: PlaceableSpace): boolean {
  return crop.supportedSpaces.includes(space.type);
}

function placementOrder(placement: ContainerPlacement): number {
  const position = placement.position;
  if (position && typeof position === "object" && "order" in position) {
    const order = (position as { order: unknown }).order;
    if (typeof order === "number") return order;
  }
  return Number.MAX_SAFE_INTEGER;
}
