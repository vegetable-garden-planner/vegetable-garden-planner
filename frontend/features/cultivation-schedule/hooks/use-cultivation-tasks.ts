"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CultivationTask } from "@/features/cultivation-schedule/domain/cultivation-task";
import {
  CULTIVATION_TASKS_STORAGE_KEY,
  getCultivationTasksSnapshot,
  parseCultivationTasksSnapshot,
} from "@/features/cultivation-schedule/infrastructure/cultivation-task-storage";
import { subscribeToBrowserStorage } from "@/shared/infrastructure/browser-storage-events";

export type CultivationTasksState =
  | { status: "ready"; tasks: CultivationTask[] }
  | { status: "error"; message: string };

export function useCultivationTasks(): CultivationTasksState {
  const snapshot = useSyncExternalStore(
    subscribeToStorage,
    () => getCultivationTasksSnapshot(window.localStorage),
    getEmptySnapshot,
  );

  return useMemo(() => {
    try {
      return { status: "ready", tasks: parseCultivationTasksSnapshot(snapshot) };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error
          ? error.message
          : "재배 일정을 불러오지 못했습니다.",
      };
    }
  }, [snapshot]);
}

function subscribeToStorage(onStoreChange: () => void) {
  return subscribeToBrowserStorage(CULTIVATION_TASKS_STORAGE_KEY, onStoreChange);
}

function getEmptySnapshot() {
  return "";
}
