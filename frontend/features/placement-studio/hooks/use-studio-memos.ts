"use client";

import { useCallback, useEffect, useState } from "react";
import type { SpaceMemo } from "@/features/space-memo/domain/space-memo";
import {
  createSpaceMemo,
  deleteSpaceMemo,
  fetchSpaceMemos,
  updateSpaceMemo,
} from "@/features/space-memo/infrastructure/space-memo-api";

/**
 * 화분에 붙는 메모
 *
 * 실제 API 를 그대로 쓴다. (GET/POST /spaces/{id}/memos, PATCH/DELETE /memos/{id})
 * 메모는 spaceId 와 선택적으로 cropId 를 가지므로, 화분 옆에 붙이고
 * 화분을 옮기면 따라오는 프로토타입 동작을 실제 데이터로 구현할 수 있다.
 *
 * 저장 버튼과 무관하게 즉시 서버에 반영된다. 되돌리기 대상이 아니다.
 */
export function useStudioMemos(spaceIds: readonly string[]) {
  const [memos, setMemos] = useState<SpaceMemo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const key = [...spaceIds].sort().join("|");

  const reload = useCallback(async () => {
    const ids = key ? key.split("|") : [];
    try {
      const lists = await Promise.all(ids.map((id) => fetchSpaceMemos(id)));
      setMemos(lists.flat());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "메모를 불러오지 못했습니다.");
    }
  }, [key]);

  useEffect(() => {
    let active = true;
    const ids = key ? key.split("|") : [];
    void Promise.all(ids.map((id) => fetchSpaceMemos(id))).then(
      (lists) => { if (active) { setMemos(lists.flat()); setError(null); } },
      (cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "메모를 불러오지 못했습니다.");
      },
    );
    return () => { active = false; };
  }, [key]);

  const add = useCallback(async (spaceId: string, body: string, cropId: string | null) => {
    await createSpaceMemo(spaceId, { body, cropId });
    await reload();
  }, [reload]);

  const edit = useCallback(async (memo: SpaceMemo, body: string, cropId: string | null) => {
    await updateSpaceMemo(memo, { body, cropId });
    await reload();
  }, [reload]);

  const remove = useCallback(async (memo: SpaceMemo) => {
    await deleteSpaceMemo(memo);
    await reload();
  }, [reload]);

  return { memos, error, reload, add, edit, remove };
}
