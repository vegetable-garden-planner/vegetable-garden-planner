"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** 사용자가 모션 최소화를 켜 두었는지 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const handle = () => setReduced(query.matches);
    query.addEventListener("change", handle);
    return () => query.removeEventListener("change", handle);
  }, []);

  return reduced;
}

/** 마운트 직후 true — 첫 화면 등장 모션을 실제로 재생시키기 위해 사용 */
export function useMounted(delay = 60) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  return mounted;
}

/**
 * 화면에 들어오면 true. 한 번 들어오면 유지한다.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  rootMargin = "-12% 0px -12% 0px"
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView } as const;
}

/**
 * 스크롤 값을 부드럽게 따라가게 하는 공통 루프
 *
 * 스크롤 위치를 그대로 쓰면 손가락 움직임에 1:1로 붙어 반응이 날카롭게 느껴진다.
 * 목표값을 향해 매 프레임 조금씩 다가가게 해서 한 박자 늦게 따라오도록 만든다.
 * smoothing 이 작을수록 더 여유롭게 움직인다.
 */
function useSmoothScrollValue(
  compute: () => number,
  enabled: boolean,
  smoothing = 0.09
) {
  const [value, setValue] = useState(0);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const frameRef = useRef(0);
  const computeRef = useRef(compute);
  computeRef.current = compute;

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      const diff = targetRef.current - currentRef.current;

      if (Math.abs(diff) < 0.0004) {
        currentRef.current = targetRef.current;
        setValue(currentRef.current);
        frameRef.current = 0;
        return;
      }

      currentRef.current += diff * smoothing;
      setValue(currentRef.current);
      frameRef.current = requestAnimationFrame(run);
    };

    const sync = () => {
      targetRef.current = computeRef.current();
      if (!frameRef.current) frameRef.current = requestAnimationFrame(run);
    };

    // 첫 값은 즉시 반영해 화면이 비어 보이지 않게 한다
    targetRef.current = computeRef.current();
    currentRef.current = targetRef.current;
    setValue(targetRef.current);

    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);

    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [enabled, smoothing]);

  return value;
}

/**
 * 요소가 화면을 지나가는 동안의 진행도 0~1.
 * 모션 최소화 설정이면 1로 고정해 최종 상태를 보여 준다.
 */
export function useElementProgress<T extends HTMLElement = HTMLDivElement>(
  ref: RefObject<T | null>,
  smoothing = 0.09
) {
  const reduced = useReducedMotion();

  const progress = useSmoothScrollValue(
    () => {
      const element = ref.current;
      if (!element) return 0;
      const rect = element.getBoundingClientRect();
      const travel = rect.height + window.innerHeight;
      const passed = window.innerHeight - rect.top;
      return Math.min(1, Math.max(0, passed / travel));
    },
    !reduced,
    smoothing
  );

  return reduced ? 1 : progress;
}

/**
 * 화면에 고정(sticky)되어 있는 동안의 진행도 0~1
 *
 * useElementProgress 는 요소가 화면 아래에서 올라와 위로 빠져나갈 때까지를
 * 0~1로 잡는다. 그래서 sticky 장면에 쓰면 아직 고정되기도 전에 연출이
 * 절반쯤 진행돼 버린다.
 *
 * 이 훅은 "화면에 붙어 있는 구간"만 0~1로 잡는다.
 * 섹션 높이가 400vh 라면 300vh 를 스크롤하는 동안 0에서 1까지 간다.
 */
export function usePinnedProgress<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  smoothing = 0.09
) {
  const reduced = useReducedMotion();

  const progress = useSmoothScrollValue(
    () => {
      const element = ref.current;
      if (!element) return 0;
      const rect = element.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return 0;
      return Math.min(1, Math.max(0, -rect.top / travel));
    },
    !reduced,
    smoothing
  );

  return reduced ? 1 : progress;
}

/** 문서 전체 스크롤 진행도 0~1 (배경 연출용) */
export function usePageProgress() {
  const reduced = useReducedMotion();

  return useSmoothScrollValue(
    () => {
      const travel = document.documentElement.scrollHeight - window.innerHeight;
      return travel <= 0 ? 0 : Math.min(1, window.scrollY / travel);
    },
    !reduced,
    0.06
  );
}

/** 첫 화면이 빠져나가는 정도 0~1 */
export function useViewportExit() {
  const reduced = useReducedMotion();

  const exit = useSmoothScrollValue(
    () => Math.min(1, window.scrollY / Math.max(1, window.innerHeight)),
    !reduced,
    0.12
  );

  return reduced ? 0 : exit;
}

/** PC 마우스 위치에 따른 미세 시차 (-1 ~ 1) */
export function usePointerOffset() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };

    const run = () => {
      current = {
        x: current.x + (target.x - current.x) * 0.06,
        y: current.y + (target.y - current.y) * 0.06,
      };

      setOffset(current);

      if (
        Math.abs(target.x - current.x) < 0.001 &&
        Math.abs(target.y - current.y) < 0.001
      ) {
        frame = 0;
        return;
      }

      frame = requestAnimationFrame(run);
    };

    const onMove = (event: PointerEvent) => {
      target = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
      if (!frame) frame = requestAnimationFrame(run);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return offset;
}

/**
 * 시간에 따라 0 → 1 로 저절로 차오르는 값
 *
 * 스크롤과 무관하게 재생되므로 로딩 게이지처럼 "알아서 진행되는" 연출에 쓴다.
 * 한 번 끝나면 1에 머문다.
 */
export function useAutoProgress(active: boolean, duration = 2400) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;

    if (reduced) {
      setValue(1);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // 처음엔 빠르게, 끝으로 갈수록 천천히 (계산이 마무리되는 느낌)
      setValue(t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, reduced]);

  return value;
}

/** 화면에 들어오면 0에서 목표값까지 올라가는 숫자 */
export function useCountUp(target: number, active: boolean, duration = 1800) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;

    if (reduced) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration, reduced]);

  return value;
}

/* ------------------------------ 계산 도우미 ------------------------------ */

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 전체 진행도 p 안에서 [start, end] 구간만 0~1로 잘라낸다 */
export const band = (p: number, start: number, end: number) =>
  end === start ? 0 : clamp01((p - start) / (end - start));

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** p가 [start,end]를 지나는 동안 from → to 로 부드럽게 이동 */
export const track = (
  p: number,
  start: number,
  end: number,
  from: number,
  to: number
) => from + (to - from) * easeOut(band(p, start, end));
