"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { GardenLayout } from "@/features/garden-layout/domain/garden-layout";
import {
  GARDEN_LAYOUTS_STORAGE_KEY,
  getGardenLayoutsSnapshot,
  parseGardenLayoutsSnapshot,
} from "@/features/garden-layout/infrastructure/garden-layout-storage";
import { subscribeToBrowserStorage } from "@/shared/infrastructure/browser-storage-events";

export type GardenLayoutsState =
  | { status: "ready"; layouts: GardenLayout[] }
  | { status: "error"; message: string };

export function useGardenLayouts(): GardenLayoutsState {
  const snapshot = useSyncExternalStore(
    subscribeToStorage,
    () => getGardenLayoutsSnapshot(window.localStorage),
    getEmptySnapshot,
  );

  return useMemo(() => {
    try {
      return { status: "ready", layouts: parseGardenLayoutsSnapshot(snapshot) };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error
          ? error.message
          : "텃밭 격자를 불러오지 못했습니다.",
      };
    }
  }, [snapshot]);
}

function subscribeToStorage(onStoreChange: () => void) {
  return subscribeToBrowserStorage(GARDEN_LAYOUTS_STORAGE_KEY, onStoreChange);
}

function getEmptySnapshot() {
  return "";
}
