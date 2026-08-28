"use client";

import { useSpaceMemos } from "@/features/space-memo/hooks/use-space-memos";

/**
 * 홈에서 쓰는 읽기 전용 메모 요약
 *
 * 메모를 쓰고 지우는 일은 상세 화면(화분/공간)에서 한다.
 * 홈에서는 남긴 메모가 있는지, 가장 최근에 뭐라고 적었는지만 한 줄로 보여 준다.
 */
export function SpaceMemoSummary({ spaceId }: { spaceId: string }) {
  const memosState = useSpaceMemos(spaceId);

  if (memosState.status !== "ready" || memosState.memos.length === 0) return null;

  const latest = memosState.memos[0];

  return (
    <p className="mt-2 line-clamp-1 text-sm text-muted">
      메모 {memosState.memos.length}개 · {latest.body}
    </p>
  );
}
