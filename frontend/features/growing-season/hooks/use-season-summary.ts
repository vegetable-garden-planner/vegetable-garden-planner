"use client";

import { useMemo } from "react";
import type { SeasonSummary } from "@/features/growing-season/domain/season-summary";
import { fetchSeasonSummary } from "@/features/growing-season/infrastructure/season-summary-api";
import { useCachedResource } from "@/shared/hooks/use-cached-resource";

export type SeasonSummaryState =
  | { status: "loading" }
  | { status: "ready"; summary: SeasonSummary }
  | { status: "error"; message: string };

export function useSeasonSummary(
  seasonId: string,
): SeasonSummaryState & { reload: () => Promise<void> } {
  const { state, reload } = useCachedResource<SeasonSummary>(
    `season-summary:${seasonId}`,
    () => fetchSeasonSummary(seasonId),
    "재배 계획 요약을 불러오지 못했습니다.",
  );

  return useMemo(() => {
    if (state.status === "ready") return { status: "ready", summary: state.data, reload };
    if (state.status === "error") return { status: "error", message: state.message, reload };
    return { status: "loading", reload };
  }, [state, reload]);
}
