"use client";

import { findPlacement, findPlanter, growthWidthCm } from "@/features/placement-studio/domain/studio-model";
import {
  plantingLabel,
  statusIcon,
  statusText,
  supportLabel,
  validatePlacement,
  validationMessage,
  SPACE_LABELS,
  SUN_LABELS,
  type CheckStatus,
} from "@/features/placement-studio/domain/validation";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "../placement-studio.module.css";

const PILL: Record<string, string> = {
  good: styles.pillGood, warning: styles.pillWarning, bad: styles.pillBad, info: styles.pillInfo,
};
const ICON: Record<string, string> = {
  good: styles.iconGood, warning: styles.iconWarning, bad: styles.iconBad, info: styles.iconInfo,
};
const CARD: Record<string, string> = {
  good: styles.cardGood, warning: styles.cardWarning, bad: styles.cardBad,
};

/** 작물 한 포기. 재배 적합도를 규칙 엔진으로만 계산해 보여 준다. */
export function CropInspector({ studio, id }: { studio: StudioController; id: string }) {
  const placement = findPlacement(studio.state, id);
  const planter = placement ? findPlanter(studio.state, placement.planterId) : undefined;
  const crop = placement ? studio.context?.cropsById.get(placement.cropId) : undefined;
  const validation = placement ? validatePlacement(studio.validationInput, placement) : null;

  if (!placement || !planter || !crop || !validation) return null;

  const nearest = validation.nearest === null
    ? "주변 작물 없음"
    : `${Math.round(validation.nearest)}cm / 권장 ${Math.round(validation.need)}cm`;

  return (
    <>
      <div className={styles.inspectorHead}>
        <h3>{crop.name}</h3>
        <span className={`${styles.statusPill} ${PILL[validation.overall]}`}>
          {statusIcon(validation.overall)} {statusText(validation.overall)}
        </span>
      </div>

      <div className={styles.insSection}>
        <h4>작물 정보</h4>
        <div className={styles.metric}><span>현재 화분</span><b>{planter.name}</b></div>
        <div className={styles.metric}><span>격자 위치</span><b>{placement.col + 1}열 · {placement.row + 1}행</b></div>
        <div className={styles.metric}><span>식재 기준</span><b>1칸 · 1기준점</b></div>
        <div className={styles.metric}><span>재배 방식</span><b>{plantingLabel(crop)}</b></div>
        <div className={styles.metric}><span>권장 간격</span><b>{growthWidthCm(crop)}cm</b></div>
        <div className={styles.metric}>
          <span>심은 날짜</span>
          <b>{placement.plantedAt ?? "기록 없음"}</b>
        </div>
        <div className={styles.metric}>
          <span>알맞은 공간</span>
          <b>{crop.supportedSpaces.map((space) => SPACE_LABELS[space] ?? space).join(" · ")}</b>
        </div>
      </div>

      <div className={styles.insSection}>
        <div className={`${styles.validationCard} ${CARD[validation.overall]}`}>
          <div className={styles.validationHead}>
            <strong>재배 적합도</strong>
            <span className={`${styles.statusPill} ${PILL[validation.overall]}`}>
              {statusText(validation.overall)} · {validation.score}점
            </span>
          </div>
          <div className={styles.checkList}>
            <CheckRow name="작물 간격" status={validation.spacing} value={nearest} />
            <CheckRow
              name="화분 깊이"
              status={validation.depth}
              value={depthText(planter.d, crop.minPotDepthCm)}
            />
            <CheckRow
              name="햇빛"
              status={validation.sun}
              value={`${SUN_LABELS[planter.sun] ?? "정보 없음"} / 필요 ${SUN_LABELS[crop.sunRequirement ?? ""] ?? "정보 없음"}`}
            />
            <CheckRow
              name="계절"
              status={validation.season}
              value={crop.plantingPeriod.label || `${crop.plantingPeriod.startMonth}~${crop.plantingPeriod.endMonth}월`}
            />
            <CheckRow name="지지 구조" status={validation.support} value={supportLabel(crop)} />
          </div>
          <div className={styles.explainBox}>{validationMessage(validation, crop, planter)}</div>
        </div>

        <button
          className={styles.recommendBtn}
          onClick={() => studio.showRecommendations(placement.id)}
          type="button"
        >
          ⌖ 더 적합한 위치 보기
        </button>
        <div className={styles.ruleNote}>
          아이콘은 한 칸 가운데에 있지만, 판정은 실제 칸 간격(cm)과 주변 작물까지 계산합니다.
          기준값이 없는 항목은 숫자를 만들지 않고 &lsquo;확인&rsquo;으로 둡니다.
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.btn}
          onClick={() => {
            const created = studio.actions.duplicateCrop(placement.id);
            if (created) studio.select("crop", created);
            else studio.notify("빈 칸이 없습니다.");
          }}
          type="button"
        >
          복제
        </button>
        <button
          className={styles.dangerBtn}
          onClick={() => {
            studio.actions.deleteCrops([placement.id]);
            studio.select(null, null);
          }}
          type="button"
        >
          삭제
        </button>
      </div>
    </>
  );
}

function depthText(planterDepth: number | null, needed: number | null): string {
  if (planterDepth === null) return "화분 깊이 미입력";
  if (needed === null) return `${planterDepth}cm / 권장 깊이 자료 없음`;
  return `${planterDepth}cm / 권장 ${needed}cm+`;
}

function CheckRow({ name, status, value }: { name: string; status: CheckStatus; value: string }) {
  return (
    <div className={styles.checkRow}>
      <span className={styles.checkName}>{name}</span>
      <span className={styles.checkValue}>
        <i className={`${styles.checkIcon} ${ICON[status]}`}>{statusIcon(status)}</i>
        {value}
      </span>
    </div>
  );
}
