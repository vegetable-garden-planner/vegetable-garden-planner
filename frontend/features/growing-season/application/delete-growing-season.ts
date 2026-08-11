import { loadSeasonRecords } from "../../season-record/infrastructure/season-record-storage.ts";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";

export class GrowingSeasonHasRecordsError extends Error {
  constructor() {
    super("저장된 시즌 기록을 먼저 삭제해야 시즌을 삭제할 수 있습니다.");
  }
}

export function assertGrowingSeasonCanBeDeleted(
  storage: KeyValueStorage,
  seasonId: string,
): void {
  if (loadSeasonRecords(storage).some((record) => record.seasonId === seasonId)) {
    throw new GrowingSeasonHasRecordsError();
  }
}
