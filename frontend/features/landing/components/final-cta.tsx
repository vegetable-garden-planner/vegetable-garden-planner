"use client";

import { useRef } from "react";
import { clamp01, track } from "../hooks/use-motion";
import { useScenePlay } from "../hooks/use-scene-play";
import { PlantCta } from "./plant-cta";

/** 마지막 문장 — 줄 안에서 단어별로 어긋나게 올린다 */
const HEADLINE = [
  ["이제,", "내", "공간에", "맞는"],
  ["작은", "텃밭을", "시작해보세요."],
];

/** 지나온 다섯 장면 */
const STEPS = ["시작", "고민", "하는 일", "결과", "시작하기"];

/**
 * Scene 5 — 마지막 안내
 *
 * 아래에서 한 줄기가 올라와 끝에서 점 하나로 맺히고,
 * 그 위로 문장이 단어별로 들어선 뒤 버튼이 자리를 잡는다.
 * 지나온 다섯 장면이 아래에 눈금으로 남아 흐름을 닫아 준다.
 */
export function FinalCta() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const p = useScenePlay(sectionRef, 2.4);

  return (
    <section
      id="scene-start"
      ref={sectionRef}
      className="lp-snap-scene relative z-10 flex h-[100svh] flex-col justify-center overflow-hidden"
    >
      <div className="lp-shell-rail lp-shell-wide w-full">
        <div className="mx-auto flex max-w-[64rem] flex-col items-center text-center">
          {/* 05 · 시작하기 */}
          <div
            className="flex items-center gap-3"
            style={{ opacity: track(p, 0, 0.14, 0, 1) }}
          >
            <span
              aria-hidden="true"
              className="block h-px w-10 origin-right bg-lp-brand-soft/60"
              style={{ transform: `scaleX(${track(p, 0.02, 0.2, 0, 1)})` }}
            />
            <p className="lp-type-caption tabular-nums tracking-[0.2em] text-lp-brand-soft">
              05 시작하기
            </p>
            <span
              aria-hidden="true"
              className="block h-px w-10 origin-left bg-lp-brand-soft/60"
              style={{ transform: `scaleX(${track(p, 0.02, 0.2, 0, 1)})` }}
            />
          </div>

          {/* 한 줄기가 아래로 내려와 점으로 맺힌다 */}
          <span
            aria-hidden="true"
            className="mt-7 block h-[68px] w-px origin-top bg-gradient-to-b from-transparent via-lp-brand-soft/50 to-lp-brand-soft"
            style={{ transform: `scaleY(${track(p, 0.06, 0.34, 0, 1)})` }}
          />
          <span
            aria-hidden="true"
            className="-mt-1 block h-[7px] w-[7px] rounded-full bg-lp-brand-soft"
            style={{
              opacity: track(p, 0.3, 0.4, 0, 1),
              transform: `scale(${track(p, 0.3, 0.46, 0, 1)})`,
            }}
          />

          {/* 문장 — 단어별 */}
          <h2 className="mt-8 lp-type-hero text-white">
            <span className="sr-only">
              이제, 내 공간에 맞는 작은 텃밭을 시작해보세요.
            </span>
            <span aria-hidden="true">
              {HEADLINE.map((line, lineIndex) => (
                <span
                  key={lineIndex}
                  className="block overflow-hidden pb-[0.08em]"
                >
                  {line.map((word, wordIndex) => {
                    const order = lineIndex * 4 + wordIndex;
                    const start = 0.34 + order * 0.035;
                    const on = track(p, start, start + 0.2, 0, 1);
                    return (
                      <span
                        key={`${word}-${wordIndex}`}
                        className="mx-[0.14em] inline-block"
                        style={{
                          opacity: on,
                          transform: `translateY(${(1 - on) * 112}%)`,
                        }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </span>
              ))}
            </span>
          </h2>

          <div
            className="mt-12"
            style={{
              opacity: track(p, 0.66, 0.82, 0, 1),
              transform: `translateY(${track(p, 0.66, 0.82, 22, 0)}px)`,
            }}
          >
            <PlantCta size="lg" />

            <p className="mt-7 lp-type-body text-white/45">
              화분 크기만 알면 바로 계획을 만들 수 있어요.
            </p>
          </div>

          {/* 지나온 다섯 장면 */}
          <div
            aria-hidden="true"
            className="mt-14 hidden w-full max-w-[620px] items-center gap-3 lg:flex"
            style={{ opacity: track(p, 0.78, 0.95, 0, 1) }}
          >
            {STEPS.map((step, index) => (
              <div key={step} className="flex flex-1 flex-col gap-2">
                <span className="block h-px w-full overflow-hidden bg-white/12">
                  <span
                    className="block h-full origin-left bg-lp-brand-soft/80"
                    style={{
                      transform: `scaleX(${clamp01(
                        track(p, 0.78 + index * 0.03, 0.9 + index * 0.03, 0, 1)
                      )})`,
                    }}
                  />
                </span>
                <span className="lp-type-caption-sm tabular-nums text-white/30">
                  0{index + 1} {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-shell-wide absolute inset-x-0 bottom-0 border-t border-white/10 py-8">
        <div className="flex flex-col gap-2 lp-type-caption text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>심어봄 · 베란다 텃밭 계획 서비스</p>
          <p>화면의 수치는 예시이며 실제 재배 환경에 따라 달라질 수 있어요.</p>
        </div>
      </div>
    </section>
  );
}
