"use client";

import { LandingHeader } from "./landing-header";
import { LandingBackdrop } from "./landing-backdrop";
import { PlanterStageMount } from "./planter-stage-mount";
import { SceneRail } from "./scene-rail";
import { HeroSection } from "./hero-section";
import { QuestionScene } from "./question-scene";
import { HowItWorksScene } from "./how-it-works-scene";
import { ResultScene } from "./result-scene";
import { FinalCta } from "./final-cta";
import { useLandingChrome } from "../hooks/use-landing-chrome";

/**
 * 심어봄 소개 랜딩 (비로그인 사용자의 `/`)
 *
 * 배경은 화면에 고정된 한 장이고, 스크롤에 따라 빛의 위치와 밝기만 바뀐다.
 * 섹션마다 배경 블록을 두지 않으므로 장면 사이에 경계선이 생기지 않는다.
 *
 * 심어보기 · 시작하기 CTA 는 develop 의 기존 `/start` 로 이어진다.
 */
export function LandingPage() {
  useLandingChrome();

  return (
    <div className="lp-root relative w-full bg-lp-forest">
      <LandingBackdrop />
      {/* 배경(z-0)과 본문(z-10) 사이에서 스크롤에 따라 움직이는 3D 무대 */}
      <PlanterStageMount />
      <SceneRail />
      <LandingHeader />

      <main className="relative z-10">
        <HeroSection />
        <QuestionScene />
        <HowItWorksScene />
        <ResultScene />
        <FinalCta />
      </main>
    </div>
  );
}
