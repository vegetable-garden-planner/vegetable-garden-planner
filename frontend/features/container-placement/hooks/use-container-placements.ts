"use client";

import { useMemo } from "react";
import type { ContainerPlacements } from "@/features/container-placement/domain/container-placement";
import { fetchContainerPlacements } from "@/features/container-placement/infrastructure/container-placement-api";
import { useCachedResource } from "@/shared/hooks/use-cached-resource";

export type ContainerPlacementsState =
  | { status: "loading" }
  | { status: "ready"; placements: ContainerPlacements }
  | { status: "error"; message: string };

export function useContainerPlacements(
  seasonId: string,
): ContainerPlacementsState & { reload: () => Promise<void> } {
  const { state, reload } = useCachedResource<ContainerPlacements>(
    `container-placements:${seasonId}`,
    () => fetchContainerPlacements(seasonId),
    "화분 배치를 불러오지 못했습니다.",
  );

  return useMemo(() => {
    if (state.status === "ready") return { status: "ready", placements: state.data, reload };
    if (state.status === "error") return { status: "error", message: state.message, reload };
    return { status: "loading", reload };
  }, [state, reload]);
}
