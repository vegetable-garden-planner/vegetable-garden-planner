"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionAwareLink } from "@/components/session-aware-link";
import {
  CARE_TIME_OPTIONS,
  SPACE_OPTIONS,
  SUNLIGHT_OPTIONS,
} from "@/features/start-diagnosis/data/questions";
import {
  getRecommendation,
  isCompleteDiagnosis,
  type DiagnosisAnswers,
  type GrowingGoal,
} from "@/features/start-diagnosis/domain/diagnosis";
import { PlanterViewport } from "./planter-viewport";
import styles from "./diagnosis-form.module.css";

const STAGES = ["화분 크기", "작물 선택", "공간 조건"] as const;

const CROP_OPTIONS: readonly CropOption[] = [
  { id: "lettuce", label: "잎채소", detail: "상추 · 루꼴라", goal: "easy", image: "/figma/image3.png" },
  { id: "tomato", label: "방울토마토", detail: "햇빛이 좋은 공간", goal: "edible", image: "/figma/image7.png" },
  { id: "basil", label: "바질", detail: "향긋한 첫 수확", goal: "edible", image: "/figma/image5.png" },
  { id: "strawberry", label: "딸기", detail: "달콤한 열매", goal: "edible", image: "/figma/image6.png" },
  { id: "mixed", label: "모둠 채소", detail: "여러 작물을 조금씩", goal: "easy", image: "/figma/image1.png" },
  { id: "flowers", label: "꽃과 허브", detail: "보고 향을 즐기는 밭", goal: "flowers", image: "/figma/image4.png" },
];

const SCENE_IMAGES = [
  "/figma/diagnosis-greenhouse-reference-empty.png",
  "/figma/image2.png",
  "/figma/image1.png",
  "/figma/image1.png",
  "/figma/layout-greenhouse.png",
] as const;

type Measurements = { width: number; length: number; height: number; count: number };
type CropOption = { id: string; label: string; detail: string; goal: GrowingGoal; image: string };
type PlanVariant = "balanced" | "simple";

const MEASUREMENT_LIMITS: Record<keyof Measurements, { min: number; max: number; step: number }> = {
  width: { min: 10, max: 120, step: 5 },
  length: { min: 10, max: 60, step: 5 },
  height: { min: 10, max: 60, step: 5 },
  count: { min: 1, max: 12, step: 1 },
};

export function DiagnosisForm() {
  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<DiagnosisAnswers>>({});
  const [cropId, setCropId] = useState<string>();
  const [measurements, setMeasurements] = useState<Measurements>({ width: 60, length: 25, height: 20, count: 2 });
  const [selectedPlan, setSelectedPlan] = useState<PlanVariant>("balanced");
  const recommendation = isCompleteDiagnosis(answers) ? getRecommendation(answers) : null;
  const railStep = Math.min(step, STAGES.length - 1);
  const isFollowUpState = step >= STAGES.length;

  useEffect(() => {
    if (step !== 3 || !isCompleteDiagnosis(answers)) return;
    const timer = window.setTimeout(() => {
      setStep(4);
      setMaxVisitedStep(4);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [answers, step]);

  function changeMeasurement(key: keyof Measurements, amount: number) {
    const { max, min } = MEASUREMENT_LIMITS[key];
    setMeasurements((current) => ({
      ...current,
      [key]: Math.min(max, Math.max(min, current[key] + amount)),
    }));
  }

  function selectCrop(option: CropOption) {
    setCropId(option.id);
    setAnswers((current) => ({ ...current, goal: option.goal }));
  }

  function updateAnswer<K extends keyof DiagnosisAnswers>(key: K, value: DiagnosisAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function advance(nextStep = step + 1) {
    setStep(nextStep);
    setMaxVisitedStep((current) => Math.max(current, nextStep));
  }

  function restart() {
    setAnswers({});
    setCropId(undefined);
    setMeasurements({ width: 60, length: 25, height: 20, count: 2 });
    setSelectedPlan("balanced");
    setStep(0);
    setMaxVisitedStep(0);
  }

  return (
    <section
      aria-label="맞춤 재배 시작 진단"
      className={`${styles.diagnosis} ${styles[`stage${step}`]}`}
    >
      <div className={styles.sceneBackdrop} aria-hidden="true">
        <Image alt="" className={styles.sceneImage} fill key={SCENE_IMAGES[step]} priority={step === 0} sizes="100vw" src={SCENE_IMAGES[step]} />
      </div>
      <div className={styles.sceneShade} aria-hidden="true" />
      <div className={styles.sceneTexture} aria-hidden="true" />

      {step === 0 && (
        <DimensionStage measurements={measurements} onAdvance={() => advance(1)} onChange={changeMeasurement} />
      )}
      {step === 1 && (
        <CropStage cropId={cropId} onAdvance={() => advance(2)} onBack={() => setStep(0)} onSelect={selectCrop} />
      )}
      {step === 2 && (
        <ConditionStage answers={answers} onAdvance={() => advance(3)} onBack={() => setStep(1)} onUpdate={updateAnswer} />
      )}
      {step === 3 && <AnalysisStage />}
      {step === 4 && recommendation && (
        <ResultStage
          answers={answers}
          measurements={measurements}
          onRestart={restart}
          onSelectPlan={setSelectedPlan}
          recommendation={recommendation}
          selectedPlan={selectedPlan}
        />
      )}

      <ol className={styles.stepRail} aria-label="진단 진행 단계">
        {STAGES.map((label, index) => (
          <li
            className={!isFollowUpState && index === railStep ? styles.activeStep : index < railStep || isFollowUpState ? styles.completeStep : ""}
            key={label}
          >
            <button
              aria-current={!isFollowUpState && index === railStep ? "step" : undefined}
              aria-label={`${index + 1}단계, ${label}`}
              disabled={index > Math.min(maxVisitedStep, STAGES.length - 1)}
              onClick={() => setStep(index)}
              type="button"
            >
              <small>{label}</small>
              <span>{index + 1}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DimensionStage({
  measurements,
  onAdvance,
  onChange,
}: {
  measurements: Measurements;
  onAdvance: () => void;
  onChange: (key: keyof Measurements, amount: number) => void;
}) {
  return (
    <div className={styles.dimensionStage}>
      <svg aria-hidden="true" className={styles.clipDefs} focusable="false">
        <defs>
          <clipPath clipPathUnits="objectBoundingBox" id="dimension-sweep-clip">
            <path d="M 0 0.24 C 0.22 0.06 0.5 -0.04 0.7 0.08 C 0.89 0.2 0.91 0.62 1 1 L 0 1 Z" />
          </clipPath>
        </defs>
      </svg>
      <header className={styles.dimensionHeading}>
        <h1>사용할 화분의<br />크기를 알려주세요</h1>
        <span>가로, 세로, 깊이와 화분 개수를 입력하면<br />맞춤 재배 계획을 계산해드려요.</span>
      </header>
      <div className={styles.whiteSweep}>
        <div className={styles.measurementGrid}>
          {(Object.keys(measurements) as (keyof Measurements)[]).map((key) => {
            const { max, min, step } = MEASUREMENT_LIMITS[key];
            const label = getMeasurementLabel(key);
            return (
              <div className={styles.measurement} key={key}>
                <span aria-hidden="true" className={styles.measurementIcon} data-kind={key}><i /></span>
                <span className={styles.measurementLabel}>{label}</span>
                <small>{key === "count" ? "(개)" : "(cm)"}</small>
                <button aria-label={`${label} 값 줄이기`} disabled={measurements[key] <= min} onClick={() => onChange(key, -step)} type="button">−</button>
                <strong aria-live="polite">{measurements[key]}</strong>
                <button aria-label={`${label} 값 늘리기`} disabled={measurements[key] >= max} onClick={() => onChange(key, step)} type="button">+</button>
              </div>
            );
          })}
        </div>
        <div className={styles.dimensionActions}>
          <Link className={styles.backButton} href="/"><span aria-hidden="true">←</span> 이전</Link>
          <button className={styles.primaryButton} onClick={onAdvance} type="button">다음 <span aria-hidden="true">→</span></button>
        </div>
      </div>
      <PlanterViewport measurements={measurements} />
    </div>
  );
}

function CropStage({
  cropId,
  onAdvance,
  onBack,
  onSelect,
}: {
  cropId?: string;
  onAdvance: () => void;
  onBack: () => void;
  onSelect: (option: CropOption) => void;
}) {
  return (
    <div className={styles.cropStage}>
      <div className={styles.cropPanel}>
        <header>
          <p>첫 수확을 상상해 보세요</p>
          <h1>처음 키울 작물을<br />골라주세요</h1>
          <span>마음이 가는 작물 하나를 고르면 비슷한 관리 난이도로 묶어드려요.</span>
        </header>
        <div className={styles.cropGrid} role="radiogroup" aria-label="선호 작물">
          {CROP_OPTIONS.map((option) => {
            const selected = cropId === option.id;
            return (
              <button
                aria-checked={selected}
                className={`${styles.cropCard} ${selected ? styles.cropSelected : ""}`}
                key={option.id}
                onClick={() => onSelect(option)}
                role="radio"
                type="button"
              >
                <Image alt="" fill sizes="(max-width: 768px) 42vw, 180px" src={option.image} />
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <b aria-hidden="true">{selected ? "✓" : ""}</b>
              </button>
            );
          })}
        </div>
        <Navigation backLabel="이전" disabled={!cropId} nextLabel="공간 조건 보기" onBack={onBack} onNext={onAdvance} />
      </div>
      <div className={styles.cropSceneLabel} aria-hidden="true">
        <span>선택한 작물</span>
        <strong>{CROP_OPTIONS.find((option) => option.id === cropId)?.label ?? "아직 고르는 중"}</strong>
        <small>화분 배치를 실시간으로 준비하고 있어요</small>
      </div>
    </div>
  );
}

function ConditionStage({
  answers,
  onAdvance,
  onBack,
  onUpdate,
}: {
  answers: Partial<DiagnosisAnswers>;
  onAdvance: () => void;
  onBack: () => void;
  onUpdate: <K extends keyof DiagnosisAnswers>(key: K, value: DiagnosisAnswers[K]) => void;
}) {
  const complete = Boolean(answers.space && answers.sunlight && answers.careTime);
  return (
    <div className={styles.conditionStage}>
      <header>
        <p>마지막으로 한 가지만 더</p>
        <h1>이 공간의 빛과 돌봄 조건을 알려주세요</h1>
        <span>완벽한 환경보다 실제 생활에 맞는 조건이 더 중요해요.</span>
      </header>
      <div className={styles.conditionSummary}>
        <ConditionGroup label="공간" options={SPACE_OPTIONS} selected={answers.space} onSelect={(value) => onUpdate("space", value)} />
        <ConditionGroup label="햇빛" options={SUNLIGHT_OPTIONS} selected={answers.sunlight} onSelect={(value) => onUpdate("sunlight", value)} />
        <ConditionGroup label="돌봄" options={CARE_TIME_OPTIONS} selected={answers.careTime} onSelect={(value) => onUpdate("careTime", value)} />
      </div>
      <Navigation backLabel="이전" disabled={!complete} nextLabel="추천 계산하기" onBack={onBack} onNext={onAdvance} />
    </div>
  );
}

function ConditionGroup<T extends string>({
  label,
  onSelect,
  options,
  selected,
}: {
  label: string;
  onSelect: (value: T) => void;
  options: readonly { value: T; label: string; description: string }[];
  selected?: T;
}) {
  return (
    <fieldset className={styles.conditionGroup}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label className={selected === option.value ? styles.conditionSelected : ""} key={option.value}>
            <input checked={selected === option.value} name={label} onChange={() => onSelect(option.value)} type="radio" value={option.value} />
            <strong>{shortenOptionLabel(option.label)}</strong>
            <small>{option.description}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function AnalysisStage() {
  return (
    <div className={styles.analysisStage} aria-live="polite">
      <p>공간을 분석하고 있어요</p>
      <div className={styles.analysisPanel}>
        <span className={styles.scanLine} aria-hidden="true" />
        <span className={styles.analysisLeaf} aria-hidden="true">⌁</span>
        <strong>빛, 공간, 돌봄 시간을<br />한데 맞추는 중이에요</strong>
        <small>잠시만 기다려 주세요</small>
      </div>
      <div className={styles.loadingTrack} aria-hidden="true"><span /></div>
    </div>
  );
}

function ResultStage({
  answers,
  measurements,
  onRestart,
  onSelectPlan,
  recommendation,
  selectedPlan,
}: {
  answers: Partial<DiagnosisAnswers>;
  measurements: Measurements;
  onRestart: () => void;
  onSelectPlan: (variant: PlanVariant) => void;
  recommendation: ReturnType<typeof getRecommendation>;
  selectedPlan: PlanVariant;
}) {
  const spacePath = `/spaces/new?type=${recommendation.spaceTypeKey}&width=${measurements.width}&length=${measurements.length}&sunlight=${answers.sunlight}&preset=${selectedPlan}`;
  const plans = [
    { value: "balanced" as const, label: "추천 배치", title: recommendation.plants.join(" · "), detail: recommendation.title, image: "/figma/image3.png" },
    { value: "simple" as const, label: "간편 배치", title: recommendation.plants.slice(0, 1).join(" · "), detail: "작물 수를 줄여 관리에 여유를 둬요", image: "/figma/image5.png" },
  ];
  return (
    <div className={styles.resultStage} aria-live="polite">
      <header>
        <p>공간에 맞는 두 가지 방법</p>
        <h1>이렇게 심어보세요</h1>
        <span>{recommendation.spaceType} · {measurements.width} × {measurements.length}cm</span>
      </header>
      <div className={styles.planGrid}>
        {plans.map((plan) => {
          const selected = selectedPlan === plan.value;
          return (
            <button aria-pressed={selected} className={`${styles.planCard} ${selected ? styles.planSelected : ""}`} key={plan.value} onClick={() => onSelectPlan(plan.value)} type="button">
              <span className={styles.planPlants}><Image alt="" fill sizes="(max-width: 768px) 70vw, 360px" src={plan.image} /></span>
              <span className={styles.planterModel}><i /><b /></span>
              <span className={styles.planCopy}><small>{plan.label}</small><strong>{plan.title}</strong><span>{plan.detail}</span></span>
              <em aria-hidden="true">{selected ? "✓" : ""}</em>
            </button>
          );
        })}
      </div>
      <p className={styles.resultDescription}>{recommendation.description}</p>
      <div className={styles.resultActions}>
        <button className={styles.secondaryButton} onClick={onRestart} type="button">처음부터 다시</button>
        <SessionAwareLink
          anonymousHref={`/login?next=${encodeURIComponent(spacePath)}`}
          anonymousLabel="로그인하고 이 배치로 시작하기"
          authenticatedHref={spacePath}
          authenticatedLabel="이 배치로 시작하기"
          className={styles.primaryButton}
        />
      </div>
    </div>
  );
}

function Navigation({
  backLabel,
  disabled,
  nextLabel,
  onBack,
  onNext,
}: {
  backLabel: string;
  disabled: boolean;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className={styles.navigation}>
      <button className={styles.backButton} onClick={onBack} type="button">{backLabel}</button>
      <button className={styles.primaryButton} disabled={disabled} onClick={onNext} type="button">{nextLabel} <span aria-hidden="true">→</span></button>
    </div>
  );
}

function getMeasurementLabel(key: keyof Measurements) {
  if (key === "width") return "가로";
  if (key === "length") return "세로";
  if (key === "height") return "깊이";
  return "화분 개수";
}

function shortenOptionLabel(label: string) {
  return label.replace("이 있어요", "").replace("가 있어요", "").replace("아직 ", "").replace(" 정도", "");
}
