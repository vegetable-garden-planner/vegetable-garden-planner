"use client";

import { useRef } from "react";
import { band, track } from "../hooks/use-motion";
import { useScenePlay } from "../hooks/use-scene-play";
import {
  advanceScene,
  useSceneTouchNav,
} from "../hooks/use-scene-touch-nav";

const RESULTS = [
  { label: "상추", value: 4, unit: "포기" },
  { label: "바질", value: 2, unit: "포기" },
  { label: "필요한 흙", value: 32, unit: "L" },
  { label: "수확 예상", value: 30, unit: "일" },
];

/**
 * Scene 4 — 결과
 *
 * 장면에 멈춰 서면 네 숫자가 차례로 올라간다.
 * 칸마다 윗선이 그어지고 → 라벨이 뜨고 → 숫자가 세어지고 → 아래 막대가 찬다.
 * 같은 타이밍에 3D 무대의 화분이 오른쪽으로 물러나 숫자에 자리를 내준다.
 */
export function ResultScene() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const p = useScenePlay(sectionRef, 2.6);
  // 네 숫자가 다 세어지고 문장까지 뜬 뒤에만 다음 장면으로 넘어갈 수 있다
  const done = p > 0.999;

  /*
    화면을 터치하거나 위로 드래그하면 다음 장면으로, 아래로 드래그하면
    이전 장면(하는 일)으로 넘어간다. 숫자가 다 세어지기 전에는 다음 장면으로
    넘어가지 못한다.
  */
  useSceneTouchNav(sectionRef, done);

  return (
    <section
      id="scene-result"
      ref={sectionRef}
      onClick={() => {
        if (done) advanceScene();
      }}
      className="lp-snap-scene relative z-10 flex h-[100svh] items-center overflow-hidden"
    >
      {/* 오른쪽 절반은 3D 무대의 화분 자리로 비워 둔다 */}
      <div className="lp-shell-rail lp-shell-wide w-full">
        <div className="lg:max-w-[52%]">
          <div
            className="flex flex-wrap items-end justify-between gap-6"
            style={{
              opacity: track(p, 0, 0.16, 0, 1),
              transform: `translateY(${track(p, 0, 0.16, 18, 0)}px)`,
            }}
          >
            <p className="lp-type-caption font-medium text-lp-brand-soft">
              심어봄이 만드는 결과
            </p>
            <p className="lp-type-body-sm text-white/40">
              화분 2개 · 베란다 남향 기준
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-x-14 gap-y-10 sm:grid-cols-2">
            {RESULTS.map((item, index) => {
              const start = 0.12 + index * 0.16;

              // 윗선 → 라벨 → 숫자 → 막대 순으로 이어진다
              const rule = band(p, start, start + 0.2);
              const appear = band(p, start + 0.04, start + 0.16);
              const counting = band(p, start + 0.08, start + 0.34);
              const counted = Math.round(item.value * counting);

              return (
                <div key={item.label} className="relative pt-6">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 block h-px origin-left bg-white/25"
                    style={{ transform: `scaleX(${rule})` }}
                  />

                  <div
                    style={{
                      opacity: appear,
                      transform: `translateY(${(1 - appear) * 26}px)`,
                    }}
                  >
                    <p className="lp-type-body-sm text-white/50">{item.label}</p>

                    <p className="mt-3 flex items-baseline gap-2 lp-type-numeral text-white">
                      <span
                        className="text-[clamp(56px,7.4vw,124px)] tabular-nums"
                        style={{
                          // 세는 동안 살짝 흐렸다가 또렷해진다
                          filter:
                            counting < 0.98
                              ? `blur(${(1 - counting) * 5}px)`
                              : undefined,
                        }}
                      >
                        {counted}
                      </span>
                      <span className="lp-type-card font-medium text-white/50">
                        {item.unit}
                      </span>
                    </p>

                    <span
                      aria-hidden="true"
                      className="mt-4 block h-[3px] w-full max-w-[180px] overflow-hidden rounded-full bg-white/10"
                    >
                      <span
                        className="block h-full origin-left rounded-full bg-lp-brand-soft"
                        style={{ transform: `scaleX(${counting})` }}
                      />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p
            className="mt-14 lp-type-body text-white/40"
            style={{
              opacity: track(p, 0.8, 0.96, 0, 1),
              transform: `translateY(${track(p, 0.8, 0.96, 16, 0)}px)`,
            }}
          >
            화분 크기와 햇빛만 알려주면 이 숫자가 바로 나옵니다.
          </p>
        </div>
      </div>
    </section>
  );
}
