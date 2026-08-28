"use client";

import { useCallback, useEffect, useState } from "react";
import type { CultivationRecord } from "../domain/cultivation-record";
import { fetchSeasonRecords } from "../infrastructure/cultivation-record-api";

export type CultivationRecordsState =
  | { status: "loading" }
  | { status: "ready"; records: CultivationRecord[] }
  | { status: "error"; message: string };

export function useCultivationRecords(
  seasonId: string,
): CultivationRecordsState & { reload: () => Promise<void> } {
  const [state, setState] = useState<CultivationRecordsState>({ status: "loading" });

  const reload = useCallback(async () => {
    // 아직 계획을 고르지 않았으면 부를 주소 자체가 없다.
    if (!seasonId) return;
    try {
      setState({ status: "ready", records: await fetchSeasonRecords(seasonId) });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }, [seasonId]);

  useEffect(() => {
    if (!seasonId) return;
    let active = true;
    void fetchSeasonRecords(seasonId).then(
      (records) => { if (active) setState({ status: "ready", records }); },
      (error: unknown) => { if (active) setState({ status: "error", message: toMessage(error) }); },
    );
    return () => { active = false; };
  }, [seasonId]);

  // 아직 계획을 고르지 않았으면 부를 주소가 없다. 빈 목록으로 둔다.
  if (!seasonId) return { status: "ready", records: [], reload };

  return { ...state, reload };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "재배 기록을 불러오지 못했습니다.";
}
