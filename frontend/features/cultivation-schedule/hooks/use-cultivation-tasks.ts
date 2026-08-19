"use client";

import { useMemo } from "react";
import type { CultivationTask } from "@/features/cultivation-schedule/domain/cultivation-task";
import { fetchCultivationTasks } from "@/features/cultivation-schedule/infrastructure/cultivation-task-api";
import { useCachedResource } from "@/shared/hooks/use-cached-resource";

export type CultivationTasksState =
  | { status: "loading" }
  | { status: "ready"; tasks: CultivationTask[] }
  | { status: "error"; message: string };

export function useCultivationTasks(): CultivationTasksState & { reload: () => Promise<void> } {
  const { state, reload } = useCachedResource<CultivationTask[]>(
    "tasks",
    fetchCultivationTasks,
    "재배 일정을 불러오지 못했습니다.",
  );

  return useMemo(() => {
    if (state.status === "ready") return { status: "ready", tasks: state.data, reload };
    if (state.status === "error") return { status: "error", message: state.message, reload };
    return { status: "loading", reload };
  }, [state, reload]);
}
