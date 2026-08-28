"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { SessionAwareLink } from "@/components/session-aware-link";
import { encodeNextPath } from "@/features/auth/domain/auth";
import pageStyles from "@/app/start/start.module.css";
import {
  CROP_OPTIONS,
  DEFAULT_SELECTED_CROPS,
  toggleCropSelection,
  type CropId,
} from "@/features/start-diagnosis/data/crop-selection";
import {
  DEFAULT_GARDEN_CONFIGURATOR_STATE,
  GARDEN_CONFIGURATOR_STORAGE_KEY,
  toGardenConfiguration,
  type GardenConfiguratorState,
} from "@/features/start-diagnosis/domain/garden-configuration";
import {
  createGardenRecommendation,
  type GardenRecommendation,
} from "@/features/start-diagnosis/domain/garden-recommendation";
import { CropSelectionStage } from "./crop-selection-stage";
import { PlanterViewport } from "./planter-viewport";
import { RecommendationGuide } from "./recommendation-guide";
import {
  SunlightStage,
  defaultPlacementFor,
  type PlantPlacement,
  type SunlightDuration,
  type SunlightSelection,
} from "./sunlight-stage";
import styles from "./diagnosis-form.module.css";

const STAGES = ["화분 크기", "공간의 빛", "작물 선택"] as const;

/**
 * 단계별 배경 사진.
 * 2단계(공간의 빛)는 사진을 쓰지 않는다 — 빛 자체가 화면의 내용이라
 * SunlightStage 안에서 CSS로 그린 밝은 장면을 그대로 쓴다.
 */
const SCENE_IMAGES: readonly (string | null)[] = [
  "/figma/diagnosis-greenhouse-reference-empty.png",
  null,
  "/figma/garden-room-clean.webp",
  "/figma/image1.png",
  "/figma/diagnosis-result-greenhouse-v1.png",
];

type Measurements = { width: number; length: number; height: number; count: number };

const MEASUREMENT_LIMITS: Record<keyof Measurements, { min: number; max: number; step: number }> = {
  width: { min: 10, max: 120, step: 5 },
  length: { min: 10, max: 60, step: 5 },
  height: { min: 10, max: 60, step: 5 },
  count: { min: 1, max: 12, step: 1 },
};

export function DiagnosisForm() {
  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [configuration, setConfiguration] = useState<GardenConfiguratorState>(() => createDefaultConfiguration());
  const [recommendation, setRecommendation] = useState<GardenRecommendation | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [placementTouched, setPlacementTouched] = useState(false);
  const measurements: Measurements = {
    width: configuration.planter.widthCm,
    length: configuration.planter.heightCm,
    height: configuration.planter.depthCm,
    count: configuration.planter.count,
  };
  const sunlightSelection: SunlightSelection = {
    duration: configuration.sunlight.duration,
    placement: configuration.sunlight.location,
  };
  const selectedCrops = configuration.preferences.selectedCrops;
  const completeConfiguration = toGardenConfiguration(configuration);
  const railStep = Math.min(step, STAGES.length - 1);
  const sceneImage = SCENE_IMAGES[step] ?? null;
  const isFollowUpState = step >= STAGES.length;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const restored = readStoredConfigurator();
      if (restored) {
        setConfiguration(restored.configuration);
        setRecommendation(restored.recommendation);
        if (restored.configuration.sunlight.location) setPlacementTouched(true);
        if (new URLSearchParams(window.location.search).get("stage") === "crops") {
          setStep(2);
          setMaxVisitedStep(4);
        }
      }
      if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
      setStorageReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.sessionStorage.setItem(GARDEN_CONFIGURATOR_STORAGE_KEY, JSON.stringify({
        version: 1,
        configuration,
        recommendation,
      }));
    } catch {
      // Storage is an enhancement; the in-memory configurator remains the source for this visit.
    }
  }, [configuration, recommendation, storageReady]);

  useEffect(() => {
    if (step !== 3 || !recommendation) return;
    const timer = window.setTimeout(() => {
      setStep(4);
      setMaxVisitedStep(4);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [recommendation, step]);

  function changeMeasurement(key: keyof Measurements, amount: number) {
    const { max, min } = MEASUREMENT_LIMITS[key];
    const planterKey = key === "width"
      ? "widthCm"
      : key === "length"
        ? "heightCm"
        : key === "height"
          ? "depthCm"
          : "count";
    setConfiguration((current) => ({
      ...current,
      planter: {
        ...current.planter,
        [planterKey]: Math.min(max, Math.max(min, current.planter[planterKey] + amount)),
      },
    }));
    setRecommendation(null);
  }

  function updateSunlightDuration(duration: SunlightDuration) {
    setConfiguration((current) => ({
      ...current,
      sunlight: {
        ...current.sunlight,
        duration,
        // 위치는 추천 계산에 실제로 쓰인다. 사용자가 직접 고르기 전까지는
        // 선택한 빛 상태에서 가장 흔한 위치를 채워 둔다.
        location: placementTouched && current.sunlight.location
          ? current.sunlight.location
          : defaultPlacementFor(duration),
      },
    }));
    setRecommendation(null);
  }

  function updatePlantPlacement(placement: PlantPlacement) {
    setPlacementTouched(true);
    setConfiguration((current) => ({
      ...current,
      sunlight: { ...current.sunlight, location: placement },
    }));
    setRecommendation(null);
  }

  function toggleCrop(cropId: CropId) {
    setConfiguration((current) => ({
      ...current,
      preferences: {
        selectedCrops: toggleCropSelection(current.preferences.selectedCrops, cropId),
      },
    }));
  }

  function completeCropSelection() {
    const complete = toGardenConfiguration(configuration);
    if (!complete) return;
    setRecommendation(createGardenRecommendation({
      planter: complete.planter,
      sunlight: complete.sunlight,
    }));
    advance(3);
  }

  function advance(nextStep = step + 1) {
    setStep(nextStep);
    setMaxVisitedStep((current) => Math.max(current, nextStep));
  }

  return (
    <section
      aria-label="맞춤 재배 시작 진단"
      className={`${styles.diagnosis} ${styles[`stage${step}`]}`}
    >
      <StartHeader />

      {sceneImage && <SceneBackdrop priority={step === 0} src={sceneImage} />}

      {step === 0 && (
        <DimensionStage measurements={measurements} onAdvance={() => advance(1)} onChange={changeMeasurement} />
      )}
      {step === 1 && (
        <SunlightStage
          onAdvance={() => advance(2)}
          onBack={() => setStep(0)}
          onDurationChange={updateSunlightDuration}
          onPlacementChange={updatePlantPlacement}
          selection={sunlightSelection}
        />
      )}
      {step === 2 && (
        <CropSelectionStage
          onAdvance={completeCropSelection}
          onBack={() => setStep(1)}
          onToggle={toggleCrop}
          selectedCrops={selectedCrops}
        />
      )}
      {step === 3 && <AnalysisStage />}
      {step === 4 && recommendation && completeConfiguration && (
        <RecommendationGuide
          configuration={completeConfiguration}
          recommendation={recommendation}
        />
      )}

      {step !== 2 && step !== 4 && (
        <StepRail
          isFollowUpState={isFollowUpState}
          maxVisitedStep={maxVisitedStep}
          onSelect={setStep}
          railStep={railStep}
        />
      )}
    </section>
  );
}

function SceneBackdrop({ priority, src }: { priority: boolean; src: string }) {
  return (
    <>
      <div className={styles.sceneBackdrop} aria-hidden="true">
        <Image alt="" className={styles.sceneImage} fill key={src} priority={priority} sizes="100vw" src={src} />
      </div>
      <div className={styles.sceneShade} aria-hidden="true" />
      <div className={styles.sceneTexture} aria-hidden="true" />
    </>
  );
}

function StepRail({
  isFollowUpState,
  maxVisitedStep,
  onSelect,
  railStep,
}: {
  isFollowUpState: boolean;
  maxVisitedStep: number;
  onSelect: (step: number) => void;
  railStep: number;
}) {
  return (
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
            onClick={() => onSelect(index)}
            type="button"
          >
            <small>{label}</small>
            <span>{index + 1}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function createDefaultConfiguration(): GardenConfiguratorState {
  return {
    planter: { ...DEFAULT_GARDEN_CONFIGURATOR_STATE.planter },
    sunlight: {},
    preferences: { selectedCrops: [...DEFAULT_SELECTED_CROPS] },
  };
}

function readStoredConfigurator(): {
  configuration: GardenConfiguratorState;
  recommendation: GardenRecommendation | null;
} | null {
  try {
    const raw = window.sessionStorage.getItem(GARDEN_CONFIGURATOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      configuration?: GardenConfiguratorState;
      recommendation?: GardenRecommendation | null;
    };
    const configuration = parsed.configuration;
    if (parsed.version !== 1 || !configuration) return null;
    const selectedIds = new Set(CROP_OPTIONS.map((crop) => crop.id));
    const selectedCrops = configuration.preferences?.selectedCrops;
    const planter = configuration.planter;
    if (
      !planter
      || !Number.isFinite(planter.widthCm)
      || !Number.isFinite(planter.heightCm)
      || !Number.isFinite(planter.depthCm)
      || !Number.isFinite(planter.count)
      || !Array.isArray(selectedCrops)
      || selectedCrops.some((cropId) => !selectedIds.has(cropId))
    ) return null;

    return {
      configuration: {
        planter: { ...planter },
        sunlight: { ...configuration.sunlight },
        preferences: { selectedCrops: [...selectedCrops] },
      },
      recommendation: parsed.recommendation?.planters ? parsed.recommendation : null,
    };
  } catch {
    return null;
  }
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

function getMeasurementLabel(key: keyof Measurements) {
  if (key === "width") return "가로";
  if (key === "length") return "세로";
  if (key === "height") return "깊이";
  return "화분 개수";
}

function StartHeader() {
  return (
    <div className={pageStyles.headerShell}>
      <header className={pageStyles.header}>
        <Link className={pageStyles.brand} href="/">
          <BrandMark size={22} variant="white" />
          <span>심어봄</span>
        </Link>
        <SessionAwareLink
          anonymousHref={`/login?next=${encodeNextPath("/start")}`}
          anonymousLabel="로그인"
          authenticatedHref="/dashboard"
          authenticatedLabel="내 텃밭으로"
          className={pageStyles.loginLink}
        />
      </header>
    </div>
  );
}
