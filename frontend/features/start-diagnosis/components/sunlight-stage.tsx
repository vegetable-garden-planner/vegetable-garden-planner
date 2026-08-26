"use client";

import styles from "./sunlight-stage.module.css";

/**
 * 2단계 — 이 공간의 빛
 *
 * 사용자에게 햇빛 "시간"을 계산하게 하지 않는다.
 * 창으로 들어오는 빛의 상태를 눈으로 보고 고르게 하고,
 * 그 선택을 기존 데이터 구조(duration)로 그대로 매핑한다.
 *
 * 위치(베란다/창가/실내)는 추천 계산에 실제로 쓰이므로 버리지 않고,
 * 빛 선택에 맞춰 미리 골라 둔 뒤 보조 입력으로만 조정하게 한다.
 *
 * 선택지는 그림(일러스트)을 그리지 않는다. 카드 표면에 드는 빛의 세기 자체가
 * 차이를 보여 주고, 눈금으로 단계를 한 번 더 확인시킨다.
 */

export type SunlightDuration = "2h" | "3-5h" | "6h+";
export type PlantPlacement = "balcony" | "window" | "indoor";

export interface SunlightSelection {
  duration?: SunlightDuration;
  placement?: PlantPlacement;
}

type LightLevel = "low" | "mid" | "high";

interface LightOption {
  level: LightLevel;
  steps: 1 | 2 | 3;
  duration: SunlightDuration;
  title: string;
  description: string;
  /** 이 빛 상태에서 가장 흔한 위치. 사용자가 직접 바꾸기 전까지의 기본값이다. */
  defaultPlacement: PlantPlacement;
}

export const LIGHT_OPTIONS: readonly LightOption[] = [
  {
    level: "low",
    steps: 1,
    duration: "2h",
    title: "빛이 은은하게 드는 곳",
    description: "직사광선은 거의 없지만 낮에는 환해요",
    defaultPlacement: "indoor",
  },
  {
    level: "mid",
    steps: 2,
    duration: "3-5h",
    title: "햇빛이 잠깐 드는 곳",
    description: "하루 중 몇 시간 햇빛이 직접 들어와요",
    defaultPlacement: "window",
  },
  {
    level: "high",
    steps: 3,
    duration: "6h+",
    title: "햇빛이 오래 드는 곳",
    description: "낮 동안 대부분 밝은 햇빛을 받아요",
    defaultPlacement: "balcony",
  },
];

/** 빛 상태를 고르면 위치도 함께 정해 둔다. (사용자가 직접 바꾸면 그 값을 지킨다) */
export function defaultPlacementFor(duration: SunlightDuration): PlantPlacement {
  return LIGHT_OPTIONS.find((option) => option.duration === duration)?.defaultPlacement ?? "window";
}

const PLACEMENT_OPTIONS: readonly { value: PlantPlacement; label: string }[] = [
  { value: "balcony", label: "베란다" },
  { value: "window", label: "창가" },
  { value: "indoor", label: "실내" },
];

export function SunlightStage({
  onAdvance,
  onBack,
  onDurationChange,
  onPlacementChange,
  selection,
}: {
  onAdvance: () => void;
  onBack: () => void;
  onDurationChange: (value: SunlightDuration) => void;
  onPlacementChange: (value: PlantPlacement) => void;
  selection: SunlightSelection;
}) {
  const complete = Boolean(selection.duration && selection.placement);

  return (
    <div className={styles.stage}>
      <div aria-hidden="true" className={styles.ambient} />

      <div className={styles.content}>
        <header className={styles.heading}>
          <p className={styles.kicker}>02 · 공간의 빛</p>
          <h1>이 공간에 빛이 얼마나 드나요</h1>
          <p className={styles.lead}>
            시간을 재지 않아도 괜찮아요. 창으로 들어오는 빛과 가장 비슷한 쪽을 골라주세요.
          </p>
        </header>

        <div aria-label="공간의 빛 상태" className={styles.options} role="radiogroup">
          {LIGHT_OPTIONS.map((option) => {
            const checked = selection.duration === option.duration;
            return (
              <button
                aria-checked={checked}
                className={styles.option}
                data-level={option.level}
                key={option.level}
                onClick={() => onDurationChange(option.duration)}
                role="radio"
                type="button"
              >
                {/* 카드 표면에 드는 빛 자체가 세 상태의 차이를 보여 준다 */}
                <span aria-hidden="true" className={styles.light} />
                <span aria-hidden="true" className={styles.meter} data-steps={option.steps}>
                  <i />
                  <i />
                  <i />
                </span>
                <span className={styles.optionCopy}>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span aria-hidden="true" className={styles.check} />
              </button>
            );
          })}
        </div>

        <fieldset className={styles.placement}>
          <legend>이 공간은 어디에 가까운가요</legend>
          <div className={styles.segmented}>
            {PLACEMENT_OPTIONS.map((option) => (
              <label className={styles.segment} key={option.value}>
                <input
                  checked={selection.placement === option.value}
                  name="plant-placement"
                  onChange={() => onPlacementChange(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <p className={styles.placementHint}>
            {selection.duration
              ? "고른 빛에 맞춰 미리 정해 뒀어요. 다르면 바꿔주세요."
              : "빛 상태를 고르면 여기도 함께 맞춰드려요."}
          </p>
        </fieldset>

        <div className={styles.actions}>
          <button className={styles.back} onClick={onBack} type="button">
            <span aria-hidden="true">←</span> 이전
          </button>
          <button className={styles.next} disabled={!complete} onClick={onAdvance} type="button">
            다음 <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
