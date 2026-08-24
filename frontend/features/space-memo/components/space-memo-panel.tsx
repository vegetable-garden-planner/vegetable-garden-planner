"use client";

import { useState, type FormEvent } from "react";
import { validateSpaceMemoBody, type SpaceMemo } from "@/features/space-memo/domain/space-memo";
import { createSpaceMemo, deleteSpaceMemo } from "@/features/space-memo/infrastructure/space-memo-api";
import { useSpaceMemos } from "@/features/space-memo/hooks/use-space-memos";

export function SpaceMemoPanel({ spaceId }: { spaceId: string }) {
  const memosState = useSpaceMemos(spaceId);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateSpaceMemoBody(body);
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError("");
    try {
      await createSpaceMemo(spaceId, { body: body.trim(), cropId: null });
      setBody("");
      await memosState.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "메모를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(memo: SpaceMemo) {
    setBusy(true);
    setError("");
    try {
      await deleteSpaceMemo(memo);
      await memosState.reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "메모를 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-cream p-4">
      <p className="text-xs font-bold text-leaf">메모지</p>
      {memosState.status === "loading" && <p className="mt-2 text-sm text-muted">메모를 불러오는 중이에요.</p>}
      {memosState.status === "error" && <p className="mt-2 text-sm text-[var(--color-danger)]">{memosState.message}</p>}
      {memosState.status === "ready" && (
        memosState.memos.length === 0
          ? <p className="mt-2 text-sm text-muted">아직 남긴 메모가 없어요.</p>
          : (
            <ul className="mt-2 space-y-2">
              {memosState.memos.map((memo) => (
                <li className="flex items-start justify-between gap-2 rounded-lg bg-white p-2 text-sm" key={memo.id}>
                  <span className="whitespace-pre-wrap">{memo.body}</span>
                  <button
                    className="shrink-0 text-xs font-bold text-muted underline"
                    disabled={busy}
                    onClick={() => void remove(memo)}
                    type="button"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )
      )}
      <form className="mt-3 flex gap-2" onSubmit={submit}>
        <input
          className="flex-1 rounded-lg border border-ink/10 px-3 py-2 text-sm"
          disabled={busy}
          onChange={(event) => { setBody(event.target.value); setError(""); }}
          placeholder="예: 오늘 새 잎 확인"
          value={body}
        />
        <button className="rounded-lg bg-leaf px-3 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={busy} type="submit">추가</button>
      </form>
      {error && <p className="mt-2 text-xs text-[var(--color-danger)]" role="alert">{error}</p>}
    </div>
  );
}
