"use client";

import { useSyncExternalStore } from "react";
import type { GrowingSeason } from "@/features/growing-season/domain/growing-season";
import { listGrowingSeasons } from "@/features/growing-season/infrastructure/season-api";
import { createApiResourceStore } from "@/shared/infrastructure/api-resource-store";

export type GrowingSeasonsState =
  | { status: "loading" }
  | { status: "ready"; seasons: GrowingSeason[] }
  | { status: "error"; message: string };

const store = createApiResourceStore(listGrowingSeasons);

export function useGrowingSeasons(): GrowingSeasonsState {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return state.status === "ready"
    ? { status: "ready", seasons: state.data }
    : state;
}
