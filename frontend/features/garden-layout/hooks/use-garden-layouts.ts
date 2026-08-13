"use client";

import { useCallback, useEffect, useState } from "react";
import type { GardenLayout } from "@/features/garden-layout/domain/garden-layout";
import { fetchGardenLayouts } from "@/features/garden-layout/infrastructure/garden-layout-api";

export type GardenLayoutsState =
  | { status: "loading" }
  | { status: "ready"; layouts: GardenLayout[] }
  | { status: "error"; message: string };

export function useGardenLayouts(): GardenLayoutsState & { reload: () => Promise<void> } {
  const [state, setState] = useState<GardenLayoutsState>({ status: "loading" });

  const reload = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", layouts: await fetchGardenLayouts() });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchGardenLayouts().then(
      (layouts) => {
        if (active) setState({ status: "ready", layouts });
      },
      (error: unknown) => {
        if (active) setState({ status: "error", message: toMessage(error) });
      },
    );

    return () => { active = false; };
  }, []);

  return { ...state, reload };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "텃밭 격자를 불러오지 못했습니다.";
}
