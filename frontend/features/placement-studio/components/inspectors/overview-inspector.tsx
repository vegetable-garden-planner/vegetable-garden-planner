"use client";

import { growthDensity, occupancy } from "@/features/placement-studio/domain/studio-model";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "../placement-studio.module.css";

/** 아무것도 선택하지 않았을 때: 전체 배치 분석 */
function planName(studio: StudioController): string {
  return studio.context?.plans.find((plan) => plan.id === studio.targetPlanId)?.name ?? "재배 계획";
}

export function OverviewInspector({ studio }: { studio: StudioController }) {
  const { state, counts, context } = studio;
  const planters = state.planters;
  const cropsById = context?.cropsById ?? new Map();

  const avgOccupancy = planters.length === 0 ? 0
    : Math.round(planters.reduce((sum, planter) => sum + occupancy(state, planter), 0) / planters.length);
  const avgGrowth = planters.length === 0 ? 0
    : Math.round(planters.reduce((sum, planter) => sum + growthDensity(state, planter, cropsById), 0) / planters.length);

  const overall = counts.bad > 0 ? "bad" : counts.warning > 0 ? "warning" : "good";
  const pill = overall === "good" ? styles.pillGood : overall === "warning" ? styles.pillWarning : styles.pillBad;
  const records = studio.records.status === "ready" ? studio.records.records.length : 0;

  return (
    <>
      <div className={styles.inspectorHead}>
        <h3>전체 배치</h3>
        <span className={`${styles.statusPill} ${pill}`}>
          {overall === "good" ? "상태 양호" : overall === "warning" ? "주의 있음" : "검토 필요"}
        </span>
      </div>

      {(context?.unplaced.length ?? 0) > 0 && (
        <div className={styles.warnBox}>
          예전에 수량으로만 저장된 작물 중 {context?.unplaced.reduce((sum, item) => sum + item.count, 0)}포기는
          화분 칸이 모자라 아직 놓지 못했습니다. 화분을 늘리거나 다른 화분으로 옮겨 주세요.
        </div>
      )}

      <div className={styles.insSection}>
        <h4>{studio.planFilter === "all" ? "전체 재배 공간" : (context?.plans.find((p) => p.id === studio.planFilter)?.name ?? "재배 계획")}</h4>
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}><small>화분</small><strong>{planters.length}개</strong></div>
          <div className={styles.overviewCard}><small>배치 작물</small><strong>{state.placements.length}</strong></div>
          <div className={styles.overviewCard}><small>격자 점유</small><strong>{avgOccupancy}%</strong></div>
          <div className={styles.overviewCard}><small>예상 생육 공간</small><strong>{avgGrowth}%</strong></div>
        </div>
      </div>

      <div className={styles.insSection}>
        <h4>배치 검증 요약</h4>
        <div className={styles.validationSummary}>
          <div className={styles.sGood}><b>{counts.good}</b><small>적합</small></div>
          <div className={styles.sWarning}><b>{counts.warning}</b><small>주의</small></div>
          <div className={styles.sBad}><b>{counts.bad}</b><small>부적합</small></div>
        </div>
        <div className={styles.ruleNote}>
          빈 칸 수가 아니라 작물 간격·화분 깊이·햇빛·계절을 함께 검사합니다.
          모두 실제 작물 기준정보와 화분 등록값으로만 계산합니다.
        </div>
      </div>

      <div className={styles.insSection}>
        <h4>캔버스의 화분 ({planters.length})</h4>
        {planters.map((planter) => (
          <button
            className={styles.planterRow}
            key={planter.id}
            onClick={() => { studio.select("planter", planter.id); studio.view.focus(planter); }}
            type="button"
          >
            <strong>{planter.name}</strong>
            <small>
              {planter.seasonName} · {planter.w}×{planter.h}
              {planter.d === null ? "" : `×${planter.d}`}cm
            </small>
          </button>
        ))}

        {studio.otherSpaces.length > 0 && (
          <>
            <div className={styles.label}>{planName(studio)}에 더 올릴 수 있는 화분</div>
            {studio.otherSpaces.map((space) => (
              <div className={styles.planterRowSplit} key={space.id}>
                <div className={styles.planterRowMain}>
                  <strong>{space.name}</strong>
                  <small>{space.widthCm}×{space.lengthCm}{space.depthCm === null ? "" : `×${space.depthCm}`}cm</small>
                </div>
                <button
                  className={`${styles.rowAction} ${styles.rowActionAdd}`}
                  onClick={() => {
                    studio.attachAndFit(space.id);
                    studio.notify(`${space.name}을(를) 이 계획의 캔버스에 올렸습니다.`);
                  }}
                  title="이 계획에 올리기"
                  type="button"
                >
                  ＋
                </button>
              </div>
            ))}
            <div className={styles.ruleNote}>
서로 다른 계획의 화분도 이 캔버스에 함께 놓입니다. 계획은 그대로 유지되고,
              작물과 배치 데이터는 계획끼리 섞이지 않습니다.
            </div>
          </>
        )}
      </div>

      <div className={styles.insSection}>
        <h4>메모 / 재배 기록</h4>
        <div className={styles.metric}><span>화분 메모</span><b>{studio.memos.memos.length}</b></div>
        <div className={styles.metric}><span>재배 기록</span><b>{records}</b></div>
      </div>

      <div className={styles.insSection}>
        <h4>저장되는 곳</h4>
        <div className={styles.ruleNote}>
          작물 배치·화분 정보·메모·재배 기록은 서버에 저장됩니다.<br />
          화분의 캔버스 좌표와 그룹은 현재 API 에 담을 자리가 없어 이 기기에만 남습니다.
        </div>
      </div>
    </>
  );
}
