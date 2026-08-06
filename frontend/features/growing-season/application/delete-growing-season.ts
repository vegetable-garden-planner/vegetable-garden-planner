import { loadGardenLayouts } from "../../garden-layout/infrastructure/garden-layout-storage.ts";
import { deleteGrowingSeason } from "../infrastructure/season-storage.ts";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";

export class GrowingSeasonHasLayoutError extends Error {
  constructor() {
    super("저장된 작물 배치를 먼저 삭제해야 이 시즌을 삭제할 수 있습니다.");
    this.name = "GrowingSeasonHasLayoutError";
  }
}

export function deleteGrowingSeasonWithRelations(
  storage: KeyValueStorage,
  seasonId: string,
) {
  const hasLayout = loadGardenLayouts(storage).some(
    (layout) => layout.seasonId === seasonId,
  );
  if (hasLayout) throw new GrowingSeasonHasLayoutError();

  deleteGrowingSeason(storage, seasonId);
}
