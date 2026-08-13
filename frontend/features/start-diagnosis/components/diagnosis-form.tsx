"use client";

import Image from "next/image";
import { useState } from "react";
import { SessionAwareLink } from "@/components/session-aware-link";
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
} from "@/features/start-diagnosis/domain/diagnosis";
import { OptionList } from "./option-list";
import styles from "./diagnosis-form.module.css";

const STEP_TITLES = [
  "사용할 화분과 공간의 크기를 알려주세요",
  "어떤 공간에서 시작할 수 있나요?",
  "햇빛은 하루에 얼마나 드나요?",
  "식물을 얼마나 자주 돌볼 수 있나요?",
  "식물을 키우는 가장 큰 목적은 무엇인가요?",
] as const;

const LAST_QUESTION_INDEX = STEP_TITLES.length - 1;

export function DiagnosisForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<DiagnosisAnswers>>({});
  const [measurements, setMeasurements] = useState({ width: 60, length: 25, height: 20, count: 2 });
  const isResultStep = step === STEP_TITLES.length;
  const questionStep = step - 1;
  const currentAnswer = step === 0 ? "measurements" : getCurrentAnswer(questionStep, answers);
  const recommendation = isCompleteDiagnosis(answers)
    ? getRecommendation(answers)
    : null;

  function updateAnswer<K extends keyof DiagnosisAnswers>(
    key: K,
    value: DiagnosisAnswers[K],
  ) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
    if (!currentAnswer || step > LAST_QUESTION_INDEX) {
      return;
    }

    setStep((current) => current + 1);
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
  }

  function restart() {
    setAnswers({});
    setMeasurements({ width: 60, length: 25, height: 20, count: 2 });
    setStep(0);
  }

  function changeMeasurement(key: keyof typeof measurements, amount: number) {
    setMeasurements((current) => ({
      ...current,
      [key]: Math.max(key === "count" ? 1 : 10, current[key] + amount),
    }));
  }

  if (isResultStep && recommendation) {
    const spacePath = `/spaces/new?type=${recommendation.spaceTypeKey}&width=${measurements.width}&length=${measurements.length}&sunlight=${answers.sunlight}`;
    return (
      <section aria-live="polite" className={`${styles.stage} ${styles.resultStage}`}>
        <div className={styles.resultHeading}>
          <p>분석이 끝났어요</p>
          <h1>이렇게 심어보세요</h1>
          <span>{recommendation.spaceType} / {measurements.width} × {measurements.length}cm</span>
        </div>

        <div className={styles.planGrid}>
          <article className={styles.planCard}>
            <div className={styles.planImage}>
              <Image alt="초록 잎채소가 자라는 화분" fill loading="eager" sizes="(max-width: 768px) 82vw, 360px" src="/figma/image3.png" />
            </div>
            <div>
              <span>추천안 1</span>
              <h2>{recommendation.title}</h2>
              <p>{recommendation.plants.join(", ")}</p>
            </div>
          </article>
          <article className={styles.planCard}>
            <div className={styles.planImage}>
              <Image alt="싱그러운 허브가 자라는 화분" fill loading="eager" sizes="(max-width: 768px) 82vw, 360px" src="/figma/image5.png" />
            </div>
            <div>
              <span>추천안 2</span>
              <h2>관리하기 쉬운 구성</h2>
              <p>{recommendation.preparation.slice(0, 2).join(", ")}</p>
            </div>
          </article>
        </div>

        <p className={styles.resultDescription}>{recommendation.description}</p>
        <div className={styles.resultActions}>
          <button className={styles.secondaryButton} onClick={restart} type="button">다시 진단하기</button>
          <SessionAwareLink
            anonymousHref={`/login?next=${encodeURIComponent(spacePath)}`}
            anonymousLabel="로그인하고 공간 등록하기"
            authenticatedHref={spacePath}
            authenticatedLabel="이 공간 등록하기"
            className={styles.primaryButton}
          />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.stage}>
      <div className={`${styles.questionPanel} ${step === 0 ? styles.lightPanel : styles.darkPanel}`} key={step}>
        <div className={styles.questionMeta}>
          <p>시작 진단</p>
          <span>{String(step + 1).padStart(2, "0")} / {String(STEP_TITLES.length).padStart(2, "0")}</span>
        </div>
        <h1>{STEP_TITLES[step]}</h1>
        <p className={styles.questionLead}>{getStepDescription(step)}</p>

        {step === 0 ? (
          <div className={styles.measurementGrid}>
            {(Object.keys(measurements) as (keyof typeof measurements)[]).map((key) => (
              <div className={styles.measurement} key={key}>
                <span>{getMeasurementLabel(key)}</span>
                <div>
                  <button onClick={() => changeMeasurement(key, key === "count" ? -1 : -5)} type="button" aria-label={`${getMeasurementLabel(key)} 줄이기`}>−</button>
                  <strong>{measurements[key]}</strong>
                  <small>{key === "count" ? "개" : "cm"}</small>
                  <button onClick={() => changeMeasurement(key, key === "count" ? 1 : 5)} type="button" aria-label={`${getMeasurementLabel(key)} 늘리기`}>+</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          renderQuestion(questionStep, answers, updateAnswer)
        )}

        <div className={styles.navigation}>
          <button className={styles.backButton} disabled={step === 0} onClick={goBack} type="button">이전</button>
          <button className={styles.nextButton} disabled={!currentAnswer} onClick={goNext} type="button">
            {step === LAST_QUESTION_INDEX ? "결과 보기" : "다음"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <ol className={styles.stepRail} aria-label="진단 진행 단계">
        {STEP_TITLES.map((title, index) => (
          <li className={index === step ? styles.activeStep : index < step ? styles.completeStep : undefined} key={title}>
            <span>{index + 1}</span>
            <small>{title}</small>
          </li>
        ))}
      </ol>
      <div className={styles.planterAccent} aria-hidden="true">
        <span style={{ width: `${Math.min(100, measurements.width)}%` }} />
      </div>
    </section>
  );
}

function getCurrentAnswer(
  step: number,
  answers: Partial<DiagnosisAnswers>,
): string | undefined {
  if (step === 0) return answers.space;
  if (step === 1) return answers.sunlight;
  if (step === 2) return answers.careTime;
  if (step === 3) return answers.goal;
  return undefined;
}

function getStepDescription(step: number) {
  if (step === 0) return "실제로 등록할 공간 크기를 기준으로 추천 구성을 계산해요.";
  if (step === 1) return "화분 하나부터 마당 텃밭까지, 지금 사용할 수 있는 곳을 골라주세요.";
  if (step === 2) return "창가나 베란다에서 식물이 받는 직접 햇빛 시간을 기준으로 선택해 주세요.";
  if (step === 3) return "생활 리듬에 맞는 관리 계획을 만들 수 있도록 알려주세요.";
  return "가장 기대하는 장면을 고르면 첫 작물 구성을 추천해 드려요.";
}

function getMeasurementLabel(key: "width" | "length" | "height" | "count") {
  if (key === "width") return "가로";
  if (key === "length") return "세로";
  if (key === "height") return "높이";
  return "화분 수";
}

function renderQuestion(
  step: number,
  answers: Partial<DiagnosisAnswers>,
  updateAnswer: <K extends keyof DiagnosisAnswers>(key: K, value: DiagnosisAnswers[K]) => void,
) {
  if (step === 0) {
    return <OptionList name="space" onSelect={(value) => updateAnswer("space", value)} options={SPACE_OPTIONS} selected={answers.space} />;
  }
  if (step === 1) {
    return <OptionList name="sunlight" onSelect={(value) => updateAnswer("sunlight", value)} options={SUNLIGHT_OPTIONS} selected={answers.sunlight} />;
  }
  if (step === 2) {
    return <OptionList name="care-time" onSelect={(value) => updateAnswer("careTime", value)} options={CARE_TIME_OPTIONS} selected={answers.careTime} />;
  }
  return (
    <OptionList
      imageByValue={{ easy: "/figma/image3.png", edible: "/figma/image7.png", flowers: "/figma/image6.png" }}
      name="goal"
      onSelect={(value) => updateAnswer("goal", value)}
      options={GOAL_OPTIONS}
      selected={answers.goal}
    />
  );
}
