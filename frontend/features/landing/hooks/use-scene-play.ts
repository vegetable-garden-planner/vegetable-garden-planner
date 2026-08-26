"use client";

import { useEffect, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "./use-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * 장면이 화면에 자리를 잡으면 0 → 1 로 저절로 흐르는 진행도
 *
 * 스크롤을 계속 굴려야 진행되던 방식을 바꾼 것이다.
 * 스냅으로 한 장면에 딱 멈추면, 그 자리에서 애니메이션이 재생된다.
 *
 * 기존 장면들이 쓰던 진행도(p)와 값의 의미가 같으므로
 * band(p, …) 같은 내부 연출 코드는 그대로 둘 수 있다.
 *
 * 되돌아 올라오면 다시 재생된다.
 */
export function useScenePlay<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  duration = 2.2,
  delay = 0.15
) {
  const [progress, setProgress] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    // 모션 최소화면 아래에서 바로 1을 돌려주므로 아무것도 만들지 않는다
    if (!element || reduced) return;

    const state = { value: 0 };

    const tween = gsap.to(state, {
      value: 1,
      duration,
      delay,
      ease: "none",
      paused: true,
      onUpdate: () => setProgress(state.value),
    });

    const trigger = ScrollTrigger.create({
      trigger: element,
      // 장면이 화면 절반을 넘어오면 시작한다
      start: "top 55%",
      end: "bottom 45%",
      onEnter: () => tween.restart(true),
      onEnterBack: () => tween.restart(true),
      onLeave: () => tween.progress(1),
      onLeaveBack: () => {
        tween.pause(0);
        setProgress(0);
      },
    });

    return () => {
      trigger.kill();
      tween.kill();
    };
  }, [ref, duration, delay, reduced]);

  return reduced ? 1 : progress;
}

/** 장면이 화면에 들어와 있는지 (등장/퇴장 연출용) */
export function useSceneActive<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>
) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: "top 70%",
      end: "bottom 30%",
      onToggle: (self) => setActive(self.isActive),
    });

    return () => trigger.kill();
  }, [ref]);

  return active;
}
