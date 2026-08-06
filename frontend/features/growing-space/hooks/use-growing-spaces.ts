"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import {
  GROWING_SPACES_STORAGE_KEY,
  getGrowingSpacesSnapshot,
  parseGrowingSpacesSnapshot,
} from "@/features/growing-space/infrastructure/space-storage";
import { subscribeToBrowserStorage } from "@/shared/infrastructure/browser-storage-events";

export type GrowingSpacesState =
  | { status: "ready"; spaces: GrowingSpace[] }
  | { status: "error"; message: string };

export function useGrowingSpaces(): GrowingSpacesState {
  const snapshot = useSyncExternalStore(
    subscribeToStorage,
    () => getGrowingSpacesSnapshot(window.localStorage),
    getEmptySnapshot,
  );

  return useMemo(() => {
    try {
      return { status: "ready", spaces: parseGrowingSpacesSnapshot(snapshot) };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "공간 목록을 불러오지 못했습니다.",
      };
    }
  }, [snapshot]);
}

function subscribeToStorage(onStoreChange: () => void) {
  return subscribeToBrowserStorage(GROWING_SPACES_STORAGE_KEY, onStoreChange);
}

function getEmptySnapshot() {
  return "";
}
