"use client";

import { useCallback, useEffect, useState } from "react";
import type { CultivationTask } from "@/features/cultivation-schedule/domain/cultivation-task";
import { fetchCultivationTasks } from "@/features/cultivation-schedule/infrastructure/cultivation-task-api";

export type CultivationTasksState =
  | { status: "loading" }
  | { status: "ready"; tasks: CultivationTask[] }
  | { status: "error"; message: string };

export function useCultivationTasks(): CultivationTasksState & { reload: () => Promise<void> } {
  const [state, setState] = useState<CultivationTasksState>({ status: "loading" });
  const reload = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", tasks: await fetchCultivationTasks() });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchCultivationTasks().then(
      (tasks) => { if (active) setState({ status: "ready", tasks }); },
      (error: unknown) => {
        if (active) setState({ status: "error", message: toMessage(error) });
      },
    );

    return () => { active = false; };
  }, []);

  return { ...state, reload };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "재배 일정을 불러오지 못했습니다.";
}
