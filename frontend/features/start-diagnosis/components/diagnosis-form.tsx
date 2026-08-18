"use client";

import { useState } from "react";
import Link from "next/link";
import { SessionAwareLink } from "@/components/session-aware-link";
import {
  CROP_CATEGORY_LABELS,
  CROP_DIFFICULTY_LABELS,
} from "@/features/crop-catalog/data/crop-labels";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import {
  CARE_TIME_OPTIONS,
  GOAL_OPTIONS,
  SPACE_OPTIONS,
  SUNLIGHT_OPTIONS,
} from "@/features/start-diagnosis/data/questions";
import {
  getRecommendation,
  isCompleteDiagnosis,
  type DiagnosisAnswers,
  type DiagnosisFallback,
  type DiagnosisRecommendation,
} from "@/features/start-diagnosis/domain/diagnosis";
import { OptionList } from "./option-list";
import styles from "./start-diagnosis.module.css";

const STEP_TITLES = [
  "어떤 공간에서 시작할 수 있나요?",
  "햇빛은 하루에 얼마나 드나요?",
  "식물을 얼마나 자주 돌볼 수 있나요?",
  "식물을 키우는 가장 큰 목적은 무엇인가요?",
] as const;

const LAST_QUESTION_INDEX = STEP_TITLES.length - 1;

export function DiagnosisForm() {
  const catalog = useCropCatalog();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<DiagnosisAnswers>>({});
  const isResultStep = step === STEP_TITLES.length;

  function updateAnswer<K extends keyof DiagnosisAnswers>(
    key: K,
    value: DiagnosisAnswers[K],
  ) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  const goBack = () => setStep((current) => Math.max(0, current - 1));

  function restart() {
    setAnswers({});
    setStep(0);
  }

  if (isResultStep && isCompleteDiagnosis(answers)) {
    if (catalog.status === "loading") return <CatalogLoading />;
    if (catalog.status === "error") {
      return <CatalogError message={catalog.message} onBack={goBack} />;
    }

    return (
      <ResultStep
        onBack={goBack}
        onRestart={restart}
        recommendation={getRecommendation(answers, catalog.crops)}
      />
    );
  }

  return (
    <QuestionStep
      answers={answers}
      onBack={goBack}
      onNext={() => setStep((current) => current + 1)}
      onSelect={updateAnswer}
      step={Math.min(step, LAST_QUESTION_INDEX)}
    />
  );
}

function QuestionStep({
  answers,
  onBack,
  onNext,
  onSelect,
  step,
}: {
  answers: Partial<DiagnosisAnswers>;
  onBack: () => void;
  onNext: () => void;
  onSelect: <K extends keyof DiagnosisAnswers>(key: K, value: DiagnosisAnswers[K]) => void;
  step: number;
}) {
  const currentAnswer = getCurrentAnswer(step, answers);

  return (
    <div className={styles.diagnosis}>
      <section className={styles.panel}>
        <div className={styles.progress}>
          <p>시작 진단</p>
          <p>{step + 1} / {STEP_TITLES.length}</p>
        </div>
        <div aria-hidden="true" className={styles.progressBar}>
          <span
            className={styles.progressFill}
            style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
          />
        </div>

        <h2 className={styles.question}>{STEP_TITLES[step]}</h2>
        {renderQuestion(step, answers, onSelect)}

        <div className={styles.actions}>
          <button className={styles.ghostButton} disabled={step === 0} onClick={onBack} type="button">
            이전
          </button>
          <button className={styles.primaryButton} disabled={!currentAnswer} onClick={onNext} type="button">
            {step === LAST_QUESTION_INDEX ? "결과 보기" : "다음"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ResultStep({
  onBack,
  onRestart,
  recommendation,
}: {
  onBack: () => void;
  onRestart: () => void;
  recommendation: DiagnosisRecommendation;
}) {
  const hasCrops = recommendation.crops.length > 0;

  return (
    <div className={styles.diagnosis}>
      <section aria-live="polite" className={styles.panel}>
        <p className={styles.resultKicker}>추천 시작 단계 · {recommendation.spaceTypeLabel}</p>
        <h2 className={styles.resultTitle}>{recommendation.title}</h2>
        <p className={styles.resultLead}>{recommendation.description}</p>

        <div className={styles.notes}>
          <p className={styles.note}>
            <strong>햇빛 조건</strong>
            <span>{recommendation.sunlightNote}</span>
          </p>
          {recommendation.careTimeNote && (
            <p className={styles.note}>
              <strong>관리 시간 안내</strong>
              <span>{recommendation.careTimeNote}</span>
            </p>
          )}
        </div>

        {hasCrops && (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h3>지금 시작하기 좋은 식물</h3>
              <Link href="/crops">전체 식물 보기</Link>
            </div>
            <CropList crops={recommendation.crops} />
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeading}><h3>먼저 준비할 것</h3></div>
          <ul className={styles.preparation}>
            {recommendation.preparation.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <div className={styles.resultActions}>
          <SessionAwareLink
            anonymousHref={`/login?next=${encodeURIComponent(`/spaces/new?type=${recommendation.spaceTypeKey}`)}`}
            anonymousLabel="로그인하고 공간 등록하기"
            authenticatedHref={`/spaces/new?type=${recommendation.spaceTypeKey}`}
            authenticatedLabel={`${recommendation.spaceTypeLabel} 공간 등록하기`}
            className="primary-action px-5 py-3"
          />
          <button className={styles.ghostButton} onClick={onBack} type="button">이전 답변 보기</button>
          <button className={styles.ghostButton} onClick={onRestart} type="button">처음부터 다시 하기</button>
        </div>
      </section>

      {!hasCrops && recommendation.fallback && (
        <FallbackPanel
          fallback={recommendation.fallback}
          spaceTypeLabel={recommendation.spaceTypeLabel}
        />
      )}
      {!hasCrops && !recommendation.fallback && <EmptyResult />}
    </div>
  );
}

function CropList({ crops }: { crops: readonly CropReference[] }) {
  return (
    <ul className={styles.cropList}>
      {crops.map((crop) => (
        <li key={crop.id}>
          <Link className={styles.cropCard} href={`/crops/${crop.id}`}>
            <span className={styles.cropCardHead}>
              <strong>{crop.name}</strong>
              <span>{CROP_CATEGORY_LABELS[crop.category]}</span>
            </span>
            <dl>
              <div><dt>관리 난이도</dt><dd>{CROP_DIFFICULTY_LABELS[crop.difficulty]}</dd></div>
              <div><dt>심는 시기</dt><dd>{crop.plantingPeriod.label}</dd></div>
            </dl>
            <b>재배 방법 자세히 보기</b>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FallbackPanel({
  fallback,
  spaceTypeLabel,
}: {
  fallback: DiagnosisFallback;
  spaceTypeLabel: string;
}) {
  return (
    <section aria-label={`${spaceTypeLabel} 대신 시작할 수 있는 방법`} className={styles.fallback}>
      <p>{fallback.message}</p>
      <CropList crops={fallback.crops} />
      <SessionAwareLink
        anonymousHref={`/login?next=${encodeURIComponent(`/spaces/new?type=${fallback.spaceTypeKey}`)}`}
        anonymousLabel={`로그인하고 ${fallback.spaceTypeLabel} 공간 등록하기`}
        authenticatedHref={`/spaces/new?type=${fallback.spaceTypeKey}`}
        authenticatedLabel={`${fallback.spaceTypeLabel} 공간 등록하기`}
        className={styles.fallbackAction}
      />
    </section>
  );
}

function EmptyResult() {
  return (
    <section className={styles.empty}>
      <h3>지금 조건에 맞는 기준정보가 없어요</h3>
      <p>준비된 식물 기준정보를 직접 둘러보고 시작할 식물을 골라 보세요.</p>
      <Link className="primary-action mt-5 px-5 py-3" href="/crops">전체 식물 보기</Link>
    </section>
  );
}

function CatalogLoading() {
  return (
    <div className={styles.loading} aria-label="추천 식물을 불러오는 중" role="status">
      <span />
      <span />
    </div>
  );
}

function CatalogError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className={styles.error} role="alert">
      <h2>추천 식물을 불러오지 못했어요</h2>
      <p>{message}</p>
      <div className={styles.errorActions}>
        <button className={styles.primaryButton} onClick={() => window.location.reload()} type="button">
          다시 불러오기
        </button>
        <button className={styles.ghostButton} onClick={onBack} type="button">이전 답변 보기</button>
      </div>
    </div>
  );
}

function getCurrentAnswer(
  step: number,
  answers: Partial<DiagnosisAnswers>,
): string | undefined {
  if (step === 0) return answers.space;
  if (step === 1) return answers.sunlight;
  if (step === 2) return answers.careTime;
  return answers.goal;
}

function renderQuestion(
  step: number,
  answers: Partial<DiagnosisAnswers>,
  onSelect: <K extends keyof DiagnosisAnswers>(key: K, value: DiagnosisAnswers[K]) => void,
) {
  if (step === 0) {
    return <OptionList name="space" onSelect={(value) => onSelect("space", value)} options={SPACE_OPTIONS} selected={answers.space} />;
  }
  if (step === 1) {
    return <OptionList name="sunlight" onSelect={(value) => onSelect("sunlight", value)} options={SUNLIGHT_OPTIONS} selected={answers.sunlight} />;
  }
  if (step === 2) {
    return <OptionList name="care-time" onSelect={(value) => onSelect("careTime", value)} options={CARE_TIME_OPTIONS} selected={answers.careTime} />;
  }
  return <OptionList name="goal" onSelect={(value) => onSelect("goal", value)} options={GOAL_OPTIONS} selected={answers.goal} />;
}
