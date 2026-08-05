"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { GrowingSeason } from "@/features/growing-season/domain/growing-season";
import {
  getGrowingSeasonsSnapshot,
  parseGrowingSeasonsSnapshot,
} from "@/features/growing-season/infrastructure/season-storage";

export type GrowingSeasonsState =
  | { status: "ready"; seasons: GrowingSeason[] }
  | { status: "error"; message: string };

export function useGrowingSeasons(): GrowingSeasonsState {
  const snapshot = useSyncExternalStore(
    subscribeToStorage,
    () => getGrowingSeasonsSnapshot(window.localStorage),
    getEmptySnapshot,
  );

  return useMemo(() => {
    try {
      return { status: "ready", seasons: parseGrowingSeasonsSnapshot(snapshot) };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "시즌 목록을 불러오지 못했습니다.",
      };
    }
  }, [snapshot]);
}

function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getEmptySnapshot() {
  return "";
}
