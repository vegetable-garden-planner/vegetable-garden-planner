"use client";

import { useCallback, useEffect, useState } from "react";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { fetchGrowingSpaces } from "@/features/growing-space/infrastructure/space-api";

export type GrowingSpacesState =
  | { status: "loading"; spaces: readonly [] }
  | { status: "ready"; spaces: GrowingSpace[] }
  | { status: "error"; message: string };

export function useGrowingSpaces(): GrowingSpacesState & { reload: () => Promise<void> } {
  const [state, setState] = useState<GrowingSpacesState>({ status: "loading", spaces: [] });

  const reload = useCallback(async () => {
    setState({ status: "loading", spaces: [] });
    try {
      setState({ status: "ready", spaces: await fetchGrowingSpaces() });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }, []);

  useEffect(() => { void fetchGrowingSpaces().then(
    (spaces) => setState({ status: "ready", spaces }),
    (error: unknown) => setState({ status: "error", message: toMessage(error) }),
  ); }, []);

  return { ...state, reload };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "공간 목록을 불러오지 못했습니다.";
}
