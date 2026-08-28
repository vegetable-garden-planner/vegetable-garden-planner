"use client";

import { useMemo } from "react";
import type { PersistedGrowingSeason } from "@/features/growing-season/domain/growing-season";
import { fetchGrowingSeasons } from "@/features/growing-season/infrastructure/season-api";
import { useCachedResource } from "@/shared/hooks/use-cached-resource";

export type GrowingSeasonsState =
  | { status: "loading"; seasons: readonly [] }
  | { status: "ready"; seasons: PersistedGrowingSeason[] }
  | { status: "error"; message: string };

export function useGrowingSeasons(): GrowingSeasonsState & { reload: () => Promise<void> } {
  const { state, reload } = useCachedResource<PersistedGrowingSeason[]>(
    "seasons",
    fetchGrowingSeasons,
    "재배 계획 목록을 불러오지 못했습니다.",
  );

  return useMemo(() => {
    if (state.status === "ready") return { status: "ready", seasons: state.data, reload };
    if (state.status === "error") return { status: "error", message: state.message, reload };
    return { status: "loading", seasons: [], reload };
  }, [state, reload]);
}
