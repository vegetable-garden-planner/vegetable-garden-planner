"use client";

import { useEffect, useState } from "react";
import type { WateringSchedule } from "../domain/watering";
import { fetchWateringSchedules } from "../infrastructure/watering-api";

export type AllWateringSchedulesState =
  | { status: "loading" }
  | { status: "ready"; schedules: WateringSchedule[] }
  | { status: "error"; message: string };

export function useAllWateringSchedules(): AllWateringSchedulesState {
  const [state, setState] = useState<AllWateringSchedulesState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    void fetchWateringSchedules().then(
      (schedules) => { if (active) setState({ status: "ready", schedules }); },
      (error: unknown) => {
        if (active) setState({ status: "error", message: toMessage(error) });
      },
    );
    return () => { active = false; };
  }, []);

  return state;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "물주기 일정을 불러오지 못했습니다.";
}
