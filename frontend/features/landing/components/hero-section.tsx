"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { HERO_REVEAL } from "../landing-config";
import { HeroReveal } from "./hero-reveal";
import { PlantCta } from "./plant-cta";
import { useReducedMotion, useViewportExit } from "../hooks/use-motion";

const BRAND = Array.from("심어봄");

/** 메인 카피 — 줄 안에서 단어 단위로 어긋나게 올린다 */
const COPY_LINES = [
  ["작은", "화분", "하나에서,"],
  ["나만의", "텃밭이", "시작돼요."],
];

/**
 * Scene 1 — 시작
 *
 * 사진 한 장이 화면 전체를 덮고, 그 위 정중앙에 브랜드가 선다.
 * 좌우로 나뉜 구도가 아니다.
 *
 * 배경은 두 장이 겹쳐 있다. 기본은 빈 창틀이고,
 * 커서 주변에서만 상추와 허브가 심긴 같은 창틀이 드러난다. (HeroReveal)
 *
 * 등장 시퀀스 (약 2초)
 *   가는 기준선이 그어지고 → 사진이 마스크에서 열리며 줄어들고
 *   → 라벨 → 심어봄 세 음절이 자간을 좁히며 정렬 → 밑선
 *   → 카피가 단어별로 → 설명 → 버튼 → 안내
 */
export function HeroSection() {
  const exit = useViewportExit();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let fallbackTimer: number | undefined;

    const context = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const photo = q("[data-hero-photo]");
      const frame = q("[data-hero-frame]");
      const letters = q("[data-brand-letter]");
      const brand = q("[data-hero-brand]");
      const words = q("[data-copy-word]");

      if (reduced) {
        gsap.fromTo(
          root,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.45, ease: "none" }
        );
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        delay: 0.1,
      });

      tl
        // 1. 가운데를 잡아 주는 기준선
        .fromTo(
          q("[data-rule='v']"),
          { scaleY: 0 },
          { scaleY: 1, duration: 0.9, ease: "power2.inOut" }
        )
        .fromTo(
          q("[data-rule='h']"),
          { scaleX: 0 },
          { scaleX: 1, duration: 1.1, ease: "power2.inOut" },
          "-=0.7"
        )
        // 2. 사진이 위아래 마스크에서 열린다
        .fromTo(
          frame,
          { clipPath: "inset(46% 0% 46% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "power3.inOut" },
          "-=0.95"
        )
        .fromTo(
          photo,
          { scale: 1.16 },
          { scale: 1, duration: 2.4, ease: "power2.out" },
          "<"
        )
        // 3. 작은 라벨
        .fromTo(
          q("[data-hero-label]"),
          { yPercent: 130 },
          { yPercent: 0, duration: 0.85, stagger: 0.06 },
          "-=1.15"
        )
        /*
          4. 심어봄
             자간이 넓게 벌어진 채로 흐릿하게 들어와 제자리로 좁혀진다.
             글자마다 시작이 조금씩 다르지만 끝은 같이 맞는다.
        */
        .fromTo(
          brand,
          { letterSpacing: "0.42em", filter: "blur(9px)" },
          {
            letterSpacing: "0.02em",
            filter: "blur(0px)",
            duration: 1.6,
            ease: "power3.out",
          },
          "-=0.5"
        )
        .fromTo(
          letters,
          { yPercent: 112, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1.15,
            ease: "power4.out",
            stagger: 0.075,
          },
          "<"
        )
        .fromTo(
          q("[data-brand-rule]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 1, ease: "power3.inOut" },
          "-=0.75"
        )
        // 5. 메인 카피 — 단어마다
        .fromTo(
          words,
          { yPercent: 115, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            stagger: 0.06,
          },
          "-=0.78"
        )
        // 6. 나머지
        .fromTo(
          q("[data-hero-fade]"),
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, stagger: 0.1 },
          "-=0.55"
        )
        .fromTo(
          q("[data-corner]"),
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 0.7, stagger: 0.07 },
          "-=0.6"
        );

      /*
        타임라인 구성 중 예외가 나거나 브라우저 특성으로 재생이 멈추는
        경우를 대비한 안전망. 자연 재생 시간(약 2.5초)이 지나도 끝나지
        않았으면 최종 상태로 강제 정리해 텍스트가 영영 숨어 있지 않게 한다.
      */
      fallbackTimer = window.setTimeout(() => {
        if (tl.progress() < 1) tl.progress(1);
      }, 4000);

      /* ------------------------- 멈춰 있어도 살아 있게 ------------------------- */

      gsap.to(photo, {
        scale: 1.04,
        duration: 22,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(brand, {
        letterSpacing: "0.035em",
        duration: 7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 3,
      });

      gsap.to(q("[data-hero-dot]"), {
        opacity: 0.22,
        duration: 2.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(q("[data-hero-sweep]"), {
        scaleX: 1,
        duration: 2.8,
        ease: "power2.inOut",
        repeat: -1,
        repeatDelay: 1.6,
        transformOrigin: "left center",
        onRepeat() {
          gsap.set(q("[data-hero-sweep]"), { scaleX: 0 });
        },
      });

      /* --------------------------- 마우스에 따른 깊이 --------------------------- */

      if (!window.matchMedia("(pointer: fine)").matches) return;

      const layers = [
        { nodes: photo, amount: 14 },
        { nodes: q("[data-hero-copy]"), amount: -6 },
        { nodes: q("[data-hero-mark]"), amount: -11 },
      ];

      const setters = layers.map((layer) => ({
        x: gsap.quickTo(layer.nodes, "x", { duration: 1.2, ease: "power3" }),
        y: gsap.quickTo(layer.nodes, "y", { duration: 1.2, ease: "power3" }),
        amount: layer.amount,
      }));

      const ring = q("[data-hero-ring]");
      const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" });
      const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
      const hint = q("[data-hero-hint]");

      const onMove = (event: PointerEvent) => {
        const nx = (event.clientX / window.innerWidth) * 2 - 1;
        const ny = (event.clientY / window.innerHeight) * 2 - 1;

        setters.forEach((setter) => {
          setter.x(nx * setter.amount);
          setter.y(ny * setter.amount * 0.6);
        });

        ringX(event.clientX);
        ringY(event.clientY);
        gsap.to(ring, { autoAlpha: 1, duration: 0.3, overwrite: "auto" });
        gsap.to(hint, { autoAlpha: 0, duration: 0.5, overwrite: "auto" });
      };

      const onLeave = () => {
        gsap.to(ring, { autoAlpha: 0, duration: 0.4, overwrite: "auto" });
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);

      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
      };
    }, root);

    return () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      context.revert();
    };
  }, [reduced]);

  return (
    <section
      id="scene-hero"
      ref={rootRef}
      className="lp-snap-scene relative h-[100svh] w-full overflow-hidden"
      style={{
        transform: `scale(${1 - exit * 0.045})`,
        opacity: 1 - exit * 0.85,
      }}
    >
      {/* 첫 화면 배경은 CSS 배경이라 늦게 발견된다. 미리 받게 해 둔다 */}
      <link rel="preload" as="image" href={HERO_REVEAL.base} />

      {/* ─────────────── 배경 (두 장이 겹쳐 있다) ─────────────── */}
      <div data-hero-frame className="absolute inset-0 overflow-hidden">
        <div data-hero-photo className="absolute inset-0 will-change-transform">
          {/*
            오버레이를 HeroReveal 안으로 넣는다.
            그래야 "드러나는 빛"이 오버레이 위에 얹혀,
            커서 주변만 밝아지고 글자 자리는 계속 어둡게 남는다.
          */}
          <HeroReveal>
            <div aria-hidden="true" className="absolute inset-0 bg-lp-forest/46" />
            {/* 글자가 앉는 가운데를 눌러 준다 */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(64% 70% at 50% 48%, rgba(6,23,15,0.72) 0%, rgba(6,23,15,0.5) 46%, rgba(6,23,15,0.16) 74%, transparent 90%)",
              }}
            />
            {/* 가장자리 비네트 */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(126% 106% at 50% 48%, transparent 54%, rgba(6,23,15,0.44) 84%, rgba(6,23,15,0.78) 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-[24%]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(6,23,15,0) 0%, rgba(6,23,15,0.6) 76%, #06170f 100%)",
              }}
            />
          </HeroReveal>
        </div>
      </div>

      {/* ─────────────── 미세 그래픽 ─────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* 가운데를 지나는 세로 기준선 */}
        <span
          data-rule="v"
          className="absolute left-1/2 top-0 block h-[16%] w-px origin-top bg-white/18"
        />
        <span
          data-rule="v"
          className="absolute bottom-0 left-1/2 block h-[12%] w-px origin-bottom bg-white/12"
        />
        {/* 가로 기준선 + 그 위를 지나는 빛 */}
        <span
          data-rule="h"
          className="absolute inset-x-[8%] top-[19%] block h-px origin-center overflow-hidden bg-white/10"
        >
          <span
            data-hero-sweep
            className="block h-full w-1/3 origin-left scale-x-0 bg-gradient-to-r from-transparent via-lp-brand-soft/70 to-transparent"
          />
        </span>

        {/* 네 귀퉁이 마커 */}
        {[
          "left-8 top-8 border-l border-t",
          "right-8 top-8 border-r border-t",
          "left-8 bottom-8 border-b border-l",
          "right-8 bottom-8 border-b border-r",
        ].map((position) => (
          <span
            key={position}
            data-corner
            className={`absolute hidden h-6 w-6 border-white/25 lg:block ${position}`}
          />
        ))}
      </div>

      {/* ─────────────── 가운데 콘텐츠 ─────────────── */}
      <div className="relative z-20 flex h-full items-center justify-center px-6">
        <div
          data-hero-copy
          className="flex w-full max-w-[62rem] flex-col items-center text-center will-change-transform"
        >
          {/* 라벨 */}
          <div className="flex items-center gap-3 overflow-hidden">
            <span
              data-hero-dot
              className="block h-1.5 w-1.5 rounded-full bg-lp-brand-soft"
            />
            <p
              data-hero-label
              className="lp-type-caption font-medium tracking-[0.16em] text-lp-brand-soft"
            >
              베란다 텃밭 계획 서비스
            </p>
          </div>

          {/* 브랜드 */}
          <div data-hero-mark className="mt-7 will-change-transform">
            <h1 data-hero-brand className="lp-type-brand text-white">
              <span className="sr-only">심어봄</span>
              <span
                aria-hidden="true"
                className="flex justify-center overflow-hidden pb-[0.1em]"
              >
                {BRAND.map((letter, index) => (
                  <span
                    key={`${letter}-${index}`}
                    data-brand-letter
                    className="inline-block"
                  >
                    {letter}
                  </span>
                ))}
              </span>
            </h1>

            <span
              aria-hidden="true"
              data-brand-rule
              className="mx-auto mt-4 block h-px w-[58%] max-w-[380px] origin-center bg-gradient-to-r from-transparent via-lp-brand-soft/70 to-transparent"
            />
          </div>

          {/* 메인 카피 */}
          <h2 className="mt-9 lp-type-hero text-white">
            <span className="sr-only">
              작은 화분 하나에서, 나만의 텃밭이 시작돼요.
            </span>
            <span aria-hidden="true">
              {COPY_LINES.map((line, lineIndex) => (
                <span
                  key={lineIndex}
                  className="block overflow-hidden pb-[0.08em]"
                >
                  {line.map((word, wordIndex) => (
                    <span
                      key={`${word}-${wordIndex}`}
                      data-copy-word
                      className="mx-[0.14em] inline-block"
                    >
                      {word}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </h2>

          <p
            data-hero-fade
            className="mt-7 max-w-[34ch] lp-type-body text-white/60"
          >
            내 공간과 화분에 맞는 재배 계획을 심어봄이 만들어드려요.
          </p>

          <div
            data-hero-fade
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <PlantCta />
            <a
              href="#about"
              className="group relative inline-flex h-[58px] items-center overflow-hidden rounded-full border border-white/25 px-7 lp-type-body text-white/80 transition-colors duration-300 hover:border-white/60 hover:text-white"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 origin-left scale-x-0 bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
              />
              <span className="relative transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
                서비스 알아보기
              </span>
            </a>
          </div>

          {/* 탐색 힌트 — 마우스를 움직이면 사라진다 */}
          <p
            data-hero-fade
            data-hero-hint
            className="mt-8 hidden lp-type-caption-sm tracking-[0.12em] text-white/35 lg:block"
          >
            마우스를 움직여 보세요
          </p>
        </div>
      </div>

      {/* ─────────────── 하단 안내 ─────────────── */}
      <div
        data-hero-fade
        className="absolute inset-x-0 bottom-9 z-20 hidden justify-center lg:flex"
      >
        <div className="flex items-center gap-3">
          <span className="relative block h-8 w-px bg-white/20">
            <span className="lp-scroll-hint absolute inset-0 block bg-lp-brand-soft" />
          </span>
          <span className="lp-type-caption-sm tracking-[0.14em] text-white/40">
            아래로 스크롤
          </span>
        </div>
      </div>

      {/* ─────────────── 커서 링 ─────────────── */}
      <span
        data-hero-ring
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-30 hidden h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 opacity-0 lg:block"
      />
    </section>
  );
}
