"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import {
  getGrowingSpacesSnapshot,
  parseGrowingSpacesSnapshot,
} from "@/features/growing-space/infrastructure/space-storage";

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
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getEmptySnapshot() {
  return "";
}
