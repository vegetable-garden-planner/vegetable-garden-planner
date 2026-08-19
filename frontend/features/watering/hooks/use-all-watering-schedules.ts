"use client";

import { useMemo } from "react";
import type { WateringSchedule } from "../domain/watering";
import { fetchWateringSchedules } from "../infrastructure/watering-api";
import { useCachedResource } from "@/shared/hooks/use-cached-resource";

export type AllWateringSchedulesState =
  | { status: "loading" }
  | { status: "ready"; schedules: WateringSchedule[] }
  | { status: "error"; message: string };

export function useAllWateringSchedules(): AllWateringSchedulesState {
  const { state } = useCachedResource<WateringSchedule[]>(
    "watering-schedules",
    fetchWateringSchedules,
    "물주기 일정을 불러오지 못했습니다.",
  );

  return useMemo(() => {
    if (state.status === "ready") return { status: "ready", schedules: state.data };
    if (state.status === "error") return { status: "error", message: state.message };
    return { status: "loading" };
  }, [state]);
}
