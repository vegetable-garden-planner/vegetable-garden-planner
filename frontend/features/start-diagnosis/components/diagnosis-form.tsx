"use client";

import { useState } from "react";
import Link from "next/link";
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

const STEP_TITLES = [
  "어떤 공간에서 시작할 수 있나요?",
  "햇빛은 하루에 얼마나 드나요?",
  "식물을 얼마나 자주 돌볼 수 있나요?",
  "식물을 키우는 가장 큰 목적은 무엇인가요?",
] as const;

const LAST_QUESTION_INDEX = STEP_TITLES.length - 1;

export function DiagnosisForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<DiagnosisAnswers>>({});
  const isResultStep = step === STEP_TITLES.length;
  const currentAnswer = getCurrentAnswer(step, answers);
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
    setStep(0);
  }

  if (isResultStep && recommendation) {
    return (
      <section aria-live="polite" className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-bold text-leaf">추천 시작 단계 · {recommendation.spaceType}</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{recommendation.title}</h2>
        <p className="mt-4 leading-7 text-muted">{recommendation.description}</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-cream p-5">
            <h3 className="font-bold">추천 식물</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {recommendation.plants.map((plant) => <li key={plant}>• {plant}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl bg-cream p-5">
            <h3 className="font-bold">먼저 준비할 것</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {recommendation.preparation.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link className="rounded-full bg-leaf px-5 py-3 text-center font-bold text-white" href={`/login?next=${encodeURIComponent(`/spaces/new?type=${recommendation.spaceTypeKey}`)}`}>
            이 공간으로 시작하기
          </Link>
          <button className="rounded-full border border-ink/15 px-5 py-3 font-bold" onClick={goBack} type="button">
            이전 답변 보기
          </button>
          <button className="rounded-full bg-leaf px-5 py-3 font-bold text-white" onClick={restart} type="button">
            처음부터 다시 하기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-9">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-leaf">시작 진단</p>
        <p className="text-sm text-muted">{step + 1} / {STEP_TITLES.length}</p>
      </div>
      <div aria-hidden="true" className="mt-4 h-2 overflow-hidden rounded-full bg-leaf-soft">
        <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }} />
      </div>

      <h2 className="mt-8 text-2xl font-bold tracking-tight sm:text-3xl">{STEP_TITLES[step]}</h2>
      <div className="mt-6">{renderQuestion(step, answers, updateAnswer)}</div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button className="rounded-full border border-ink/15 px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-35" disabled={step === 0} onClick={goBack} type="button">
          이전
        </button>
        <button className="rounded-full bg-leaf px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-35" disabled={!currentAnswer} onClick={goNext} type="button">
          {step === LAST_QUESTION_INDEX ? "결과 보기" : "다음"}
        </button>
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
  return <OptionList name="goal" onSelect={(value) => updateAnswer("goal", value)} options={GOAL_OPTIONS} selected={answers.goal} />;
}
