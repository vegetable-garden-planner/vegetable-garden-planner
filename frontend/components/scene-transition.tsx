"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "./brand-mark";

/**
 * 장면 전환 (SceneTransition)
 *
 * 랜딩의 CTA 처럼 "장면이 바뀌는" 이동에서만 쓰는 연출이다.
 *
 *   1. 짙은 브랜드 그린 레이어가 clip-path 로 아래에서 화면을 덮는다 (약 520ms)
 *   2. 심어봄 로고가 짧게 머문다 (약 220ms)
 *   3. 그 사이에 실제 route 가 바뀐다
 *   4. 레이어가 위로 걷히며 다음 화면이 드러난다 (약 600ms)
 *
 * route 가 바뀌는 순간에도 레이어가 유지되어야 하므로 root layout 에 둔다.
 * 전환이 없을 때는 visibility: hidden + pointer-events: none 으로
 * 완전히 비활성화되어 기존 서비스 화면을 가리거나 클릭을 막지 않는다.
 *
 * `prefers-reduced-motion` 사용자에게는 연출 없이 곧바로 이동한다.
 */

type Phase = "idle" | "covering" | "covered" | "uncovering";

const SceneTransitionContext = createContext<((href: string) => void) | null>(
  null
);

/** 전환과 함께 이동시키는 함수. Provider 밖에서는 null 이다. */
export function useSceneTransition() {
  return useContext(SceneTransitionContext);
}

const COVER_MS = 520;
const HOLD_MS = 220;
const UNCOVER_MS = 600;
const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";

export function SceneTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const target = useRef<string | null>(null);
  const busy = useRef(false);

  const navigate = useCallback(
    (href: string) => {
      if (busy.current) return;

      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        router.push(href);
        return;
      }

      busy.current = true;
      target.current = href;
      setPhase("covering");
    },
    [router]
  );

  // 다 덮이면 이동한다
  useEffect(() => {
    if (phase !== "covering") return;

    const timer = window.setTimeout(() => {
      setPhase("covered");
      if (target.current) {
        router.push(target.current);
        target.current = null;
      }
    }, COVER_MS);

    return () => window.clearTimeout(timer);
  }, [phase, router]);

  /*
    새 화면이 준비되면 걷어낸다.
    전환 중일 때만 스크롤을 맨 위로 올린다. (전환이 아닌 이동에는 손대지 않는다)
  */
  useEffect(() => {
    if (phase !== "covered") return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });

    const lift = window.setTimeout(() => setPhase("uncovering"), HOLD_MS);
    return () => window.clearTimeout(lift);
  }, [phase, pathname]);

  // 다 걷히면 레이어를 완전히 끈다 (visibility: hidden 으로 돌아간다)
  useEffect(() => {
    if (phase !== "uncovering") return;

    const done = window.setTimeout(() => {
      setPhase("idle");
      busy.current = false;
    }, UNCOVER_MS + 60);

    return () => window.clearTimeout(done);
  }, [phase]);

  /*
    clip-path 로 덮고 걷는다.
      idle       아래에 완전히 접혀 있음
      covering   아래에서 올라와 화면을 덮음
      uncovering 위로 걷히며 다음 화면이 드러남
  */
  const clip =
    phase === "covering" || phase === "covered"
      ? "inset(0% 0% 0% 0%)"
      : phase === "uncovering"
        ? "inset(0% 0% 100% 0%)"
        : "inset(100% 0% 0% 0%)";

  const duration =
    phase === "covering"
      ? COVER_MS
      : phase === "uncovering"
        ? UNCOVER_MS
        : 0;

  const showMark = phase === "covering" || phase === "covered";

  return (
    <SceneTransitionContext.Provider value={navigate}>
      {children}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[200] grid place-items-center"
        style={{
          background: "#06170f",
          clipPath: clip,
          WebkitClipPath: clip,
          transition: duration
            ? `clip-path ${duration}ms ${EASE}, -webkit-clip-path ${duration}ms ${EASE}`
            : "none",
          visibility: phase === "idle" ? "hidden" : "visible",
        }}
      >
        <span
          className="flex flex-col items-center gap-4"
          style={{
            opacity: showMark ? 1 : 0,
            transform: showMark
              ? "translateY(0) scale(1)"
              : "translateY(14px) scale(0.94)",
            transition: "opacity 320ms ease-out, transform 420ms ease-out",
            transitionDelay: phase === "covering" ? "200ms" : "0ms",
          }}
        >
          <BrandMark variant="white" size={72} />
          <span className="brand-wordmark text-[22px] text-white">
            심어봄
          </span>
        </span>
      </div>
    </SceneTransitionContext.Provider>
  );
}
