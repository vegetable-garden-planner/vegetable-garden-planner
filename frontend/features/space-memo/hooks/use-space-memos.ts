"use client";

import { useCallback, useEffect, useState } from "react";
import type { SpaceMemo } from "@/features/space-memo/domain/space-memo";
import { fetchSpaceMemos } from "@/features/space-memo/infrastructure/space-memo-api";

export type SpaceMemosState =
  | { status: "loading" }
  | { status: "ready"; memos: SpaceMemo[] }
  | { status: "error"; message: string };

export function useSpaceMemos(spaceId: string): SpaceMemosState & { reload: () => Promise<void> } {
  const [state, setState] = useState<SpaceMemosState>({ status: "loading" });

  const reload = useCallback(async () => {
    try {
      setState({ status: "ready", memos: await fetchSpaceMemos(spaceId) });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }, [spaceId]);

  useEffect(() => {
    let active = true;
    void fetchSpaceMemos(spaceId).then(
      (memos) => { if (active) setState({ status: "ready", memos }); },
      (error: unknown) => { if (active) setState({ status: "error", message: toMessage(error) }); },
    );
    return () => { active = false; };
  }, [spaceId]);

  return { ...state, reload };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "메모를 불러오지 못했습니다.";
}
