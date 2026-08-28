"use client";

import { useMemo } from "react";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { fetchGrowingSpaces } from "@/features/growing-space/infrastructure/space-api";
import { useCachedResource } from "@/shared/hooks/use-cached-resource";

export type GrowingSpacesState =
  | { status: "loading"; spaces: readonly [] }
  | { status: "ready"; spaces: GrowingSpace[] }
  | { status: "error"; message: string };

export function useGrowingSpaces(): GrowingSpacesState & { reload: () => Promise<void> } {
  const { state, reload } = useCachedResource<GrowingSpace[]>(
    "spaces",
    fetchGrowingSpaces,
    "공간 목록을 불러오지 못했습니다.",
  );

  return useMemo(() => {
    if (state.status === "ready") return { status: "ready", spaces: state.data, reload };
    if (state.status === "error") return { status: "error", message: state.message, reload };
    return { status: "loading", spaces: [], reload };
  }, [state, reload]);
}
