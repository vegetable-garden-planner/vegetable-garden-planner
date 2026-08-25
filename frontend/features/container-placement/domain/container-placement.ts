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

const MAX_QUANTITY = 500;

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

function placementOrder(placement: ContainerPlacement): number {
  const position = placement.position;
  if (position && typeof position === "object" && "order" in position) {
    const order = (position as { order: unknown }).order;
    if (typeof order === "number") return order;
  }
  return Number.MAX_SAFE_INTEGER;
}
