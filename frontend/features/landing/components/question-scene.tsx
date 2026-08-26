"use client";

import { useRef } from "react";
import { clamp01, track, usePinnedProgress } from "../hooks/use-motion";

const QUESTIONS = [
  { text: "무엇을 심어야 할까요", note: "상추? 방울토마토? 어디서부터" },
  { text: "어디에 두어야 할까요", note: "우리 집 베란다는 해가 잘 드나" },
  { text: "얼마나 심을 수 있을까요", note: "이 화분에 몇 포기가 들어갈까" },
];

/**
 * Scene 2 — 사용자의 고민
 *
 * 섹션은 하나다. 다만 그 안에 정지점을 셋 두어,
 * 휠을 한 번 굴릴 때마다 질문이 하나씩 바뀐다.
 * (scroll-snap-stop: always 라 한 번에 두 개를 건너뛰지 않는다)
 *
 * 화면에 보이는 내용은 sticky 로 붙어 있고, 스크롤 위치가 어느 질문인지만 정한다.
 */
export function QuestionScene() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const p = usePinnedProgress(sectionRef, 0.14);

  return (
    <section id="about" ref={sectionRef} className="relative z-10 h-[300vh]">
      {/* 정지점 셋 — 화면에는 보이지 않는다 */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-full">
        {QUESTIONS.map((question) => (
          <div key={question.text} className="lp-snap-scene h-[100vh]" />
        ))}
      </div>

      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="lp-shell-rail lp-shell-wide w-full">
          <p className="lp-type-caption font-medium text-lp-brand-soft">
            처음이라면 당연한 질문
          </p>

          {/* 세 질문이 같은 자리에서 교대한다 */}
          <div className="relative mt-10 h-[40vh] min-h-[260px]">
            {QUESTIONS.map((question, index) => {
              // 정지점은 0 / 0.5 / 1 에 있다
              const center = index / (QUESTIONS.length - 1);
              const on = clamp01(1 - Math.abs(p - center) / 0.42);
              const letters = Array.from(question.text);

              return (
                <div
                  key={question.text}
                  className="absolute inset-x-0 top-0 will-change-transform"
                  style={{
                    opacity: on,
                    pointerEvents: on > 0.5 ? "auto" : "none",
                    transform: `translateY(${(1 - on) * (p > center ? -54 : 54)}px)`,
                    /*
                      흐림은 블록 하나에만 건다.
                      글자마다 걸면 매 프레임 30개를 따로 흐리게 만들어 느려진다.
                    */
                    filter:
                      on > 0.02 && on < 0.94
                        ? `blur(${(1 - on) * 6}px)`
                        : undefined,
                  }}
                >
                  <p className="lp-type-caption tabular-nums text-white/35">
                    0{index + 1}
                  </p>

                  {/* 글자가 한 자씩 흐릿하게 올라온다 */}
                  <h2 className="mt-5 lp-type-display text-white">
                    <span className="sr-only">{question.text}</span>
                    <span aria-hidden="true">
                      {letters.map((letter, i) => {
                        const step = clamp01(
                          (on - (i / letters.length) * 0.35) / 0.6
                        );
                        return (
                          <span
                            key={`${letter}-${i}`}
                            className="inline-block"
                            style={{
                              opacity: step,
                              transform: `translateY(${(1 - step) * 40}px)`,
                              whiteSpace: letter === " " ? "pre" : undefined,
                            }}
                          >
                            {letter}
                          </span>
                        );
                      })}
                    </span>
                  </h2>

                  <p
                    className="mt-6 lp-type-body text-white/45"
                    style={{ opacity: clamp01((on - 0.55) / 0.35) }}
                  >
                    {question.note}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 세 질문 중 어디쯤인지 */}
          <div aria-hidden="true" className="mt-4 flex max-w-[520px] gap-2">
            {QUESTIONS.map((question, index) => (
              <span
                key={question.text}
                className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/12"
              >
                <span
                  className="block h-full origin-left rounded-full bg-lp-brand-soft"
                  style={{
                    transform: `scaleX(${clamp01(
                      p * (QUESTIONS.length - 1) - index + 1
                    )})`,
                  }}
                />
              </span>
            ))}
          </div>

          <p
            className="mt-14 max-w-[48ch] lp-type-body text-white/55"
            style={{
              opacity: track(p, 0.74, 0.96, 0, 1),
              transform: `translateY(${track(p, 0.74, 0.96, 24, 0)}px)`,
            }}
          >
            화분 하나를 앞에 두고도 무엇부터 정해야 할지 막막합니다.
            <br className="hidden sm:block" />
            심어봄은 바로 이 지점에서 시작했어요.
          </p>
        </div>
      </div>
    </section>
  );
}
