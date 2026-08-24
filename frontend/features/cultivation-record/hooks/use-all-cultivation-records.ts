"use client";

import { useMemo } from "react";
import type { CultivationRecord } from "@/features/cultivation-record/domain/cultivation-record";
import { fetchAllRecords } from "@/features/cultivation-record/infrastructure/cultivation-record-api";
import { useCachedResource } from "@/shared/hooks/use-cached-resource";

export type AllCultivationRecordsState =
  | { status: "loading" }
  | { status: "ready"; records: CultivationRecord[] }
  | { status: "error"; message: string };

export function useAllCultivationRecords(): AllCultivationRecordsState & { reload: () => Promise<void> } {
  const { state, reload } = useCachedResource<CultivationRecord[]>(
    "records",
    fetchAllRecords,
    "재배 기록을 불러오지 못했습니다.",
  );

  return useMemo(() => {
    if (state.status === "ready") return { status: "ready", records: state.data, reload };
    if (state.status === "error") return { status: "error", message: state.message, reload };
    return { status: "loading", reload };
  }, [state, reload]);
}
