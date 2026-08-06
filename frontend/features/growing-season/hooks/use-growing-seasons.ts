"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { GrowingSeason } from "@/features/growing-season/domain/growing-season";
import {
  GROWING_SEASONS_STORAGE_KEY,
  getGrowingSeasonsSnapshot,
  parseGrowingSeasonsSnapshot,
} from "@/features/growing-season/infrastructure/season-storage";
import { subscribeToBrowserStorage } from "@/shared/infrastructure/browser-storage-events";

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
  return subscribeToBrowserStorage(GROWING_SEASONS_STORAGE_KEY, onStoreChange);
}

function getEmptySnapshot() {
  return "";
}
