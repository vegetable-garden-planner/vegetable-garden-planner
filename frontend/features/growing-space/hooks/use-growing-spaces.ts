"use client";

import { useSyncExternalStore } from "react";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { listGrowingSpaces } from "@/features/growing-space/infrastructure/space-api";
import { createApiResourceStore } from "@/shared/infrastructure/api-resource-store";

export type GrowingSpacesState =
  | { status: "loading" }
  | { status: "ready"; spaces: GrowingSpace[] }
  | { status: "error"; message: string };

const store = createApiResourceStore(listGrowingSpaces);

export function useGrowingSpaces(): GrowingSpacesState {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return state.status === "ready"
    ? { status: "ready", spaces: state.data }
    : state;
}
