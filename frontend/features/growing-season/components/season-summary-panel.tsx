"use client";

import {
  formatCompletionRate,
  formatHarvestQuantity,
} from "@/features/growing-season/domain/season-summary";
import { useSeasonSummary } from "@/features/growing-season/hooks/use-season-summary";
import styles from "./season-summary-panel.module.css";

export function SeasonSummaryPanel({ seasonId }: { seasonId: string }) {
  const state = useSeasonSummary(seasonId);

  if (state.status === "loading") {
    return (
      <section className={styles.panel} aria-labelledby="season-summary-title">
        <p>시즌 요약</p>
        <h2 id="season-summary-title">지금까지의 재배 결과</h2>
        <p className={styles.status} role="status">요약을 불러오고 있습니다.</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className={styles.panel} aria-labelledby="season-summary-title">
        <p>시즌 요약</p>
        <h2 id="season-summary-title">지금까지의 재배 결과</h2>
        <p className={styles.error} role="alert">{state.message}</p>
        <button onClick={() => void state.reload()} type="button">다시 시도</button>
      </section>
    );
  }

  const { harvestTotals, taskCompletion } = state.summary;

  return (
    <section className={styles.panel} aria-labelledby="season-summary-title">
      <p>시즌 요약</p>
      <h2 id="season-summary-title">지금까지의 재배 결과</h2>

      <dl className={styles.stats}>
        <div>
          <dt>재배 일정 완료</dt>
          <dd>
            {formatCompletionRate(taskCompletion.rate)}
            <small>
              {taskCompletion.total === 0
                ? "아직 만든 일정이 없어요"
                : `${taskCompletion.total}개 중 ${taskCompletion.completed}개 완료`}
            </small>
          </dd>
        </div>
      </dl>

      <h3 className={styles.subheading}>수확량</h3>
      {harvestTotals.length === 0 ? (
        <p className={styles.empty}>아직 수량을 입력한 수확 기록이 없어요.</p>
      ) : (
        <ul className={styles.harvestList}>
          {harvestTotals.map((total) => (
            <li key={total.unit}>
              <span>{total.unit}</span>
              <strong>{formatHarvestQuantity(total.quantity)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
