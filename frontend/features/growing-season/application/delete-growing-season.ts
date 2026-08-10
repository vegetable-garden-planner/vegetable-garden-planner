import { loadCultivationTasks } from "../../cultivation-schedule/infrastructure/cultivation-task-storage.ts";
import { loadGardenLayouts } from "../../garden-layout/infrastructure/garden-layout-storage.ts";
import { loadSeasonRecords } from "../../season-record/infrastructure/season-record-storage.ts";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";

export class GrowingSeasonHasLayoutError extends Error {
  constructor() { super("저장된 작물 배치를 먼저 삭제해야 시즌을 삭제할 수 있습니다."); }
}
export class GrowingSeasonHasTasksError extends Error {
  constructor() { super("저장된 재배 일정을 먼저 삭제해야 시즌을 삭제할 수 있습니다."); }
}
export class GrowingSeasonHasRecordsError extends Error {
  constructor() { super("저장된 시즌 기록을 먼저 삭제해야 시즌을 삭제할 수 있습니다."); }
}

export function assertGrowingSeasonCanBeDeleted(storage: KeyValueStorage, seasonId: string): void {
  if (loadGardenLayouts(storage).some((layout) => layout.seasonId === seasonId)) {
    throw new GrowingSeasonHasLayoutError();
  }
  if (loadCultivationTasks(storage).some((task) => task.seasonId === seasonId)) {
    throw new GrowingSeasonHasTasksError();
  }
  if (loadSeasonRecords(storage).some((record) => record.seasonId === seasonId)) {
    throw new GrowingSeasonHasRecordsError();
  }
}
