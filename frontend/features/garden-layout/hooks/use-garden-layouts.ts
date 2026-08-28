"use client";

import { useMemo } from "react";
import type { GardenLayout } from "@/features/garden-layout/domain/garden-layout";
import { fetchGardenLayouts } from "@/features/garden-layout/infrastructure/garden-layout-api";
import { useCachedResource } from "@/shared/hooks/use-cached-resource";

export type GardenLayoutsState =
  | { status: "loading" }
  | { status: "ready"; layouts: GardenLayout[] }
  | { status: "error"; message: string };

export function useGardenLayouts(): GardenLayoutsState & { reload: () => Promise<void> } {
  const { state, reload } = useCachedResource<GardenLayout[]>(
    "layouts",
    fetchGardenLayouts,
    "텃밭 격자를 불러오지 못했습니다.",
  );

  return useMemo(() => {
    if (state.status === "ready") return { status: "ready", layouts: state.data, reload };
    if (state.status === "error") return { status: "error", message: state.message, reload };
    return { status: "loading", reload };
  }, [state, reload]);
}
