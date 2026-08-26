"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { HERO_REVEAL } from "../landing-config";

/**
 * 히어로 배경 — 마우스로 드러나는 두 장
 *
 * 아래에 빈 창틀, 그 위에 상추와 허브가 심긴 같은 창틀을 정확히 겹쳐 둔다.
 * 위쪽 장은 마스크로 가려져 있고, 커서 주변에서만 드러난다.
 *
 * 두 장은 같은 요소 안에 같은 배경 설정으로 들어가므로
 * 크기·크롭·위치가 어긋날 수 없다. 움직임도 부모에만 준다.
 *
 * 성능
 * - pointermove 마다 상태를 바꾸지 않는다. CSS 변수만 직접 갈아 끼운다.
 * - 좌표는 매 프레임 조금씩 따라가게 해서 딱딱하게 붙지 않는다.
 * - 커서가 멈추고 값이 목표에 닿으면 루프도 멈춘다.
 */
export function HeroReveal({ children }: { children?: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const fine = window.matchMedia("(pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    /*
      마우스가 없는 화면(폰·태블릿)에서는 따라다닐 커서가 없다.
      창틀 가운데에 넓게 한 번 열어 두어 심긴 모습이 보이게 한다.
    */
    if (!fine.matches) {
      root.style.setProperty("--lp-reveal-x", "50%");
      root.style.setProperty("--lp-reveal-y", "54%");
      root.style.setProperty("--lp-reveal-r", "62vw");
      return;
    }

    const view = () => ({ w: window.innerWidth, h: window.innerHeight });

    let target = { x: view().w * 0.5, y: view().h * 0.54, r: 0 };
    const current = { ...target };
    let frame = 0;

    const radius = () => {
      const { w } = view();
      return Math.min(Math.max(w * 0.26, 300), 520);
    };

    const apply = () => {
      root.style.setProperty("--lp-reveal-x", `${current.x}px`);
      root.style.setProperty("--lp-reveal-y", `${current.y}px`);
      root.style.setProperty("--lp-reveal-r", `${current.r}px`);
    };

    const run = () => {
      // 빠르게 반응하되 마지막 몇 px 은 부드럽게 따라온다
      const ease = still.matches ? 1 : 0.18;
      current.x += (target.x - current.x) * ease;
      current.y += (target.y - current.y) * ease;
      current.r += (target.r - current.r) * (still.matches ? 1 : 0.12);

      apply();

      const settled =
        Math.abs(target.x - current.x) < 0.4 &&
        Math.abs(target.y - current.y) < 0.4 &&
        Math.abs(target.r - current.r) < 0.6;

      frame = settled ? 0 : requestAnimationFrame(run);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };

    const onMove = (event: PointerEvent) => {
      target = { x: event.clientX, y: event.clientY, r: radius() };
      schedule();
    };

    const onLeave = () => {
      // 화면을 벗어나면 조용히 닫힌다
      target = { ...target, r: 0 };
      schedule();
    };

    apply();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const shared: CSSProperties = {
    backgroundPosition: HERO_REVEAL.position,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  };

  /*
    가장자리가 딱 잘리지 않도록 여러 단계로 흐린다.
    가운데는 완전히 드러나고 바깥으로 갈수록 원래 화면으로 돌아간다.
  */
  const feather =
    "radial-gradient(circle var(--lp-reveal-r, 0px) at var(--lp-reveal-x, 50%) var(--lp-reveal-y, 54%)," +
    "#000 0%, rgba(0,0,0,0.97) 34%, rgba(0,0,0,0.72) 58%," +
    "rgba(0,0,0,0.32) 78%, rgba(0,0,0,0.08) 91%, transparent 100%)";

  return (
    <div ref={rootRef} className="absolute inset-0">
      {/* 1. 빈 창틀 — 항상 보인다 */}
      <div
        role="img"
        aria-label="창틀이 비어 있는 거실"
        className="absolute inset-0"
        style={{ ...shared, backgroundImage: `url(${HERO_REVEAL.base})` }}
      />

      {/* 2. 상추와 허브가 심긴 같은 창틀 — 커서 주변에서만 */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          ...shared,
          backgroundImage: `url(${HERO_REVEAL.planted})`,
          WebkitMaskImage: feather,
          maskImage: feather,
        }}
      />

      {/*
        3. 브랜드 톤 오버레이 (바깥에서 넣어 준다)
           글자가 읽히도록 화면을 눌러 주는 층이다.
      */}
      {children}

      {/*
        4. 드러난 자리만 다시 밝힌다 — 스크림 위에 얹는다.
           screen 합성이라 눌러 둔 만큼을 비례해서 되살린다.
           덕분에 커서 주변은 "빛이 드는 자리"처럼 읽히고,
           글자가 앉는 나머지 영역은 계속 어둡게 유지된다.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle calc(var(--lp-reveal-r, 0px) * 0.94) at var(--lp-reveal-x, 50%) var(--lp-reveal-y, 54%)," +
            "rgba(104,96,74,0.92) 0%, rgba(76,72,58,0.6) 42%, rgba(40,40,32,0.24) 70%, transparent 92%)",
        }}
      />
    </div>
  );
}
