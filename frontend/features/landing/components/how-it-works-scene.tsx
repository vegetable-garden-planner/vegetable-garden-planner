"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { band, useAutoProgress, useReducedMotion } from "../hooks/use-motion";
import { useSceneActive } from "../hooks/use-scene-play";
import { setBuildProgress } from "../lib/build-signal";

/**
 * 3D 플랜터는 three.js 를 쓰므로 초기 번들에서 떼어 내고 브라우저에서만 그린다.
 * 자리(4:3)는 미리 잡아 두므로 레이아웃이 밀리지 않는다.
 */
const Planter3D = dynamic(() => import("./planter-3d"), { ssr: false });

type InputItem = {
  label: string;
  value: string;
  /** 데스크톱 배치 (컨테이너 기준 %) */
  x: number;
  y: number;
  align: "left" | "right";
};

const INPUTS: InputItem[] = [
  { label: "화분 크기", value: "60 × 25 × 20cm", x: 0, y: 6, align: "left" },
  { label: "햇빛", value: "남향 · 반나절", x: 100, y: 20, align: "right" },
  { label: "위치", value: "베란다", x: 3, y: 80, align: "left" },
  { label: "키우고 싶은 작물", value: "상추 · 바질", x: 100, y: 94, align: "right" },
];

const PLANTER_IMAGE = "/images/landing/planter-crops.webp";

/**
 * Scene 3 — 심어봄이 하는 일
 *
 * 순서가 셋이다. 모두 자동 재생이고, 스크롤로 굴리지 않는다.
 *
 *   1. 네 귀퉁이 입력값이 뜨고 계산 게이지가 0 → 100% 로 찬다
 *   2. 100% 가 되면 게이지가 물러나고 그때 3D 화분이 등장한다
 *      (바닥 도면 → 심을 자리 표식 → 포기가 자라 오름)
 *   3. 화분이 완성되면 아래에 문장이 들어선다
 */
export function HowItWorksScene() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  // 장면에 실제로 멈춰 섰을 때부터 재생한다
  const arrived = useSceneActive(sectionRef);

  // 1) 계산 게이지
  const fill = useAutoProgress(arrived, 2400);
  const calculated = fill > 0.999;

  // 2) 계산이 끝난 뒤에 3D 화분이 등장해 지어진다
  const grow = useAutoProgress(calculated, 2800);
  const done = grow > 0.999;

  useEffect(() => {
    setBuildProgress(grow);
  }, [grow]);

  return (
    <section
      id="scene-how"
      ref={sectionRef}
      className="lp-snap-scene relative z-10 flex h-[100svh] items-center overflow-hidden"
    >
      <div className="lp-shell-rail lp-shell-wide w-full">
          <p
            className="text-center lp-type-caption font-medium text-lp-brand-soft transition-opacity duration-700"
            style={{ opacity: arrived ? 1 : 0 }}
          >
            심어봄이 하는 일
          </p>

          {/* ── 데스크톱 ── */}
          <div className="relative mt-8 hidden h-[64vh] min-h-[460px] lg:block">
            {/* 네 귀퉁이 입력값 — 계속 유지된다 */}
            {INPUTS.map((item, index) => (
              <div
                key={item.label}
                className="absolute w-[21%] transition-all duration-[900ms] ease-out"
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform:
                    item.align === "right"
                      ? "translate(-100%, -50%)"
                      : "translate(0, -50%)",
                  textAlign: item.align,
                  opacity: arrived ? 1 : 0,
                  transitionDelay: `${index * 130}ms`,
                }}
              >
                <p className="lp-type-caption text-white/45">{item.label}</p>
                <p className="mt-2 lp-type-section text-white">
                  {item.value}
                </p>
                <span
                  aria-hidden="true"
                  className={`mt-4 block h-px bg-lp-brand-soft/70 transition-transform duration-700 ease-out ${
                    item.align === "right"
                      ? "ml-auto origin-right"
                      : "origin-left"
                  }`}
                  style={{
                    width: "72px",
                    transform: `scaleX(${band(
                      fill,
                      index * 0.16,
                      0.2 + index * 0.16
                    )})`,
                  }}
                />
              </div>
            ))}

            {/* 가운데 — 게이지에서 (문장 + 화분) 으로 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {/* 계산 게이지 */}
              <div
                className="grid h-[300px] w-[300px] place-items-center transition-all duration-[700ms] ease-out"
                style={{
                  opacity: calculated ? 0 : 1,
                  transform: `scale(${calculated ? 0.86 : 1})`,
                }}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="absolute h-[300px] w-[300px] -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="var(--color-lp-brand-soft)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - fill}
                  />
                </svg>

                <div className="relative text-center">
                  <p className="lp-type-caption-sm text-lp-brand-soft">
                    계산 중
                  </p>
                  <p className="mt-2 lp-type-numeral text-[52px] text-white">
                    {Math.round(fill * 100)}
                    <span className="ml-1 lp-type-card font-medium text-white/50">
                      %
                    </span>
                  </p>
                </div>
              </div>

              {/*
                모션 최소화 설정이면 스크롤 무대가 뜨지 않는다.
                그때는 원래대로 이 자리에 정지 3D를 보여 준다.
              */}
              {reduced && (
                <div
                  className="absolute left-1/2 top-1/2 w-[min(30vw,380px)] -translate-x-1/2 -translate-y-1/2"
                  style={{ opacity: done ? 1 : 0 }}
                >
                  <Planter3D
                    className="aspect-[4/3]"
                    fallbackSrc={PLANTER_IMAGE}
                    alt="상추와 쪽파가 심긴 베란다 플랜터"
                  />
                </div>
              )}
            </div>

            {/*
              계산이 끝나면 화분 아래에 문장이 들어선다.
              화분 자체는 화면에 고정된 3D 무대가 그린다.
            */}
            <div
              className="absolute inset-x-0 bottom-0 flex justify-center transition-all duration-[900ms] ease-out"
              style={{
                opacity: done ? 1 : 0,
                transform: `translateY(${done ? 0 : 22}px)`,
                filter: done ? "none" : "blur(6px)",
              }}
            >
              <div className="text-center">
                <p className="max-w-[34ch] lp-type-section text-white">
                  조건을 입력하면 심어봄이 재배 계획을 계산해드려요.
                </p>
                <p className="mt-4 lp-type-caption-sm tracking-[0.14em] text-white/35">
                  화분을 잡고 돌려 볼 수 있어요
                </p>
              </div>
            </div>
          </div>

          {/* ── 모바일 ── */}
          <div className="mt-10 lg:hidden">
            <ul className="space-y-6 border-l border-white/15 pl-6">
              {INPUTS.map((item, index) => (
                <li
                  key={item.label}
                  className="transition-all duration-700 ease-out"
                  style={{
                    opacity: arrived ? 1 : 0,
                    transform: `translateY(${arrived ? 0 : 20}px)`,
                    transitionDelay: `${index * 120}ms`,
                  }}
                >
                  <p className="lp-type-caption text-white/45">{item.label}</p>
                  <p className="mt-1 lp-type-section text-white">
                    {item.value}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <span className="block h-[3px] w-full overflow-hidden rounded-full bg-white/12">
                <span
                  className="block h-full origin-left rounded-full bg-lp-brand-soft"
                  style={{ transform: `scaleX(${fill})` }}
                />
              </span>
              <p className="mt-3 lp-type-caption tabular-nums text-white/40">
                계산 중 {Math.round(fill * 100)}%
              </p>
            </div>

            <div
              className="mt-10 transition-all duration-[900ms] ease-out"
              style={{
                opacity: done ? 1 : 0,
                transform: `translateY(${done ? 0 : 24}px)`,
                transitionDelay: done ? "400ms" : "0ms",
              }}
            >
              <p className="lp-type-section text-white">
                조건을 입력하면
                <br />
                심어봄이 재배 계획을 계산해드려요.
              </p>
              <Planter3D
                className="mt-8 aspect-[4/3]"
                fallbackSrc={PLANTER_IMAGE}
                alt="상추와 쪽파가 심긴 베란다 플랜터"
              />
            </div>
          </div>
      </div>
    </section>
  );
}
