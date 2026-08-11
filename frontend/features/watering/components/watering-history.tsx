"use client";

import type { WateringHistory, WateringLog } from "../domain/watering";

export type WateringHistoryState =
  | { status: "closed" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; history: WateringHistory };

export function WateringHistoryPanel({
  disabled,
  onReopen,
  state,
}: {
  disabled: boolean;
  onReopen: (log: WateringLog) => Promise<void>;
  state: WateringHistoryState;
}) {
  if (state.status === "closed") return null;
  if (state.status === "loading") {
    return <p className="mt-4 rounded-2xl bg-cream p-4 text-sm text-muted">물주기 이력을 불러오고 있습니다.</p>;
  }
  if (state.status === "error") {
    return <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{state.message}</p>;
  }

  const { logs, snoozes } = state.history;
  return (
    <section className="mt-4 rounded-2xl border border-ink/10 bg-cream/60 p-4" aria-label="물주기 변경 이력">
      <h4 className="font-bold">완료 이력</h4>
      {logs.length === 0 ? (
        <p className="mt-2 text-sm text-muted">아직 완료 기록이 없습니다.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {logs.map((log, index) => (
            <li className="rounded-xl bg-white p-3 text-sm" key={log.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time className="font-bold" dateTime={log.wateredAt}>{formatDateTime(log.wateredAt)}</time>
                {index === 0 && (
                  <button
                    className="text-xs font-bold text-leaf underline disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => { void onReopen(log); }}
                    type="button"
                  >
                    최신 완료 취소
                  </button>
                )}
              </div>
              <p className="mt-1 text-muted">
                {log.amountMl === null ? "물의 양 미입력" : `${log.amountMl.toLocaleString("ko-KR")}ml`}
                {log.memo ? ` · ${log.memo}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}

      <h4 className="mt-5 font-bold">미루기 이력</h4>
      {snoozes.length === 0 ? (
        <p className="mt-2 text-sm text-muted">아직 미룬 기록이 없습니다.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {snoozes.map((snooze) => (
            <li className="rounded-xl bg-white p-3 text-sm text-muted" key={snooze.id}>
              {formatDateTime(snooze.originalAt)} → <strong className="text-ink">{formatDateTime(snooze.snoozedUntil)}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "잘못된 시각";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
