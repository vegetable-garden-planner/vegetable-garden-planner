"use client";

import { useCallback, useEffect, useState } from "react";
import type { WateringSchedule } from "../domain/watering";
import { fetchSeasonWateringSchedules } from "../infrastructure/watering-api";

export type WateringSchedulesState =
  | { status: "loading" }
  | { status: "ready"; schedules: WateringSchedule[] }
  | { status: "error"; message: string };

export function useWateringSchedules(
  seasonId: string,
): WateringSchedulesState & { reload: () => Promise<void> } {
  const [state, setState] = useState<WateringSchedulesState>({ status: "loading" });

  const reload = useCallback(async () => {
    try {
      const schedules = await fetchSeasonWateringSchedules(seasonId);
      setState({ status: "ready", schedules });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }, [seasonId]);

  useEffect(() => {
    let active = true;
    void fetchSeasonWateringSchedules(seasonId).then(
      (schedules) => { if (active) setState({ status: "ready", schedules }); },
      (error: unknown) => {
        if (active) setState({ status: "error", message: toMessage(error) });
      },
    );
    return () => { active = false; };
  }, [seasonId]);

  return { ...state, reload };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "물주기 일정을 불러오지 못했습니다.";
}
