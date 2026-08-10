"use client";

import { useSyncExternalStore } from "react";
import type { CultivationTask } from "@/features/cultivation-schedule/domain/cultivation-task";
import { listCultivationTasks } from "@/features/cultivation-schedule/infrastructure/cultivation-task-api";
import { createApiResourceStore } from "@/shared/infrastructure/api-resource-store";

export type CultivationTasksState =
  | { status: "loading" }
  | { status: "ready"; tasks: CultivationTask[] }
  | { status: "error"; message: string };

const store = createApiResourceStore(listCultivationTasks);

export function useCultivationTasks(): CultivationTasksState {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return state.status === "ready"
    ? { status: "ready", tasks: state.data }
    : state;
}
