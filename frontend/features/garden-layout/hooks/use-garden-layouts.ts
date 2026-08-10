"use client";

import { useSyncExternalStore } from "react";
import type { GardenLayout } from "@/features/garden-layout/domain/garden-layout";
import { listGardenLayouts } from "@/features/garden-layout/infrastructure/garden-layout-api";
import { createApiResourceStore } from "@/shared/infrastructure/api-resource-store";

export type GardenLayoutsState =
  | { status: "loading" }
  | { status: "ready"; layouts: GardenLayout[] }
  | { status: "error"; message: string };

const store = createApiResourceStore(listGardenLayouts);

export function useGardenLayouts(): GardenLayoutsState {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return state.status === "ready"
    ? { status: "ready", layouts: state.data }
    : state;
}
