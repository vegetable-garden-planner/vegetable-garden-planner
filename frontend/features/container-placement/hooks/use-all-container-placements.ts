"use client";

import { useMemo } from "react";
import type { ContainerPlacementListItem } from "@/features/container-placement/domain/container-placement";
import { fetchAllContainerPlacements } from "@/features/container-placement/infrastructure/container-placement-api";
import { useCachedResource } from "@/shared/hooks/use-cached-resource";

export type AllContainerPlacementsState =
  | { status: "loading" }
  | { status: "ready"; placements: ContainerPlacementListItem[] }
  | { status: "error"; message: string };

export function useAllContainerPlacements(): AllContainerPlacementsState & { reload: () => Promise<void> } {
  const { state, reload } = useCachedResource<ContainerPlacementListItem[]>(
    "container-placements",
    fetchAllContainerPlacements,
    "화분 배치를 불러오지 못했습니다.",
  );

  return useMemo(() => {
    if (state.status === "ready") return { status: "ready", placements: state.data, reload };
    if (state.status === "error") return { status: "error", message: state.message, reload };
    return { status: "loading", reload };
  }, [state, reload]);
}
