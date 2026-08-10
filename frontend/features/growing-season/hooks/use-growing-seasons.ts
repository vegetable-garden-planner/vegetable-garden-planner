"use client";

import { useCallback, useEffect, useState } from "react";
import type { PersistedGrowingSeason } from "@/features/growing-season/domain/growing-season";
import { fetchGrowingSeasons } from "@/features/growing-season/infrastructure/season-api";

export type GrowingSeasonsState =
  | { status: "ready"; seasons: PersistedGrowingSeason[] }
  | { status: "error"; message: string };

export function useGrowingSeasons(): GrowingSeasonsState & { reload: () => Promise<void> } {
  const [state, setState] = useState<GrowingSeasonsState>({ status: "ready", seasons: [] });

  const reload = useCallback(async () => {
    try {
      setState({ status: "ready", seasons: await fetchGrowingSeasons() });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }, []);

  useEffect(() => { void fetchGrowingSeasons().then(
    (seasons) => setState({ status: "ready", seasons }),
    (error: unknown) => setState({ status: "error", message: toMessage(error) }),
  ); }, []);

  return { ...state, reload };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "시즌 목록을 불러오지 못했습니다.";
}
