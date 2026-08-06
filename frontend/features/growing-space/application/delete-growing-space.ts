import { loadGrowingSeasons } from "../../growing-season/infrastructure/season-storage.ts";
import { deleteGrowingSpace } from "../infrastructure/space-storage.ts";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";

export class GrowingSpaceHasSeasonsError extends Error {
  constructor() {
    super("연결된 시즌을 먼저 삭제해야 이 공간을 삭제할 수 있습니다.");
    this.name = "GrowingSpaceHasSeasonsError";
  }
}

export function deleteGrowingSpaceWithRelations(
  storage: KeyValueStorage,
  spaceId: string,
) {
  const hasLinkedSeason = loadGrowingSeasons(storage).some(
    (season) => season.spaceId === spaceId,
  );
  if (hasLinkedSeason) throw new GrowingSpaceHasSeasonsError();

  deleteGrowingSpace(storage, spaceId);
}
