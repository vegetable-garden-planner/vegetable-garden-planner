"use client";

import { useEffect, useRef, type RefObject } from "react";

const SWIPE_THRESHOLD_PX = 32;

/** 다음/이전 장면으로 한 화면 높이만큼 부드럽게 스크롤한다 */
export function advanceScene() {
  window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
}

export function backScene() {
  window.scrollBy({ top: -window.innerHeight, behavior: "smooth" });
}

/**
 * 탭이나 위로 드래그 = 다음 장면, 아래로 드래그 = 이전 장면.
 * canAdvance 가 false 인 동안은 다음 장면으로만 못 넘어간다(뒤로는 언제나 허용).
 *
 * scroll-snap-stop: always 인 장면 위에 그냥 onClick 만 얹으면, 손가락이 거의
 * 안 움직인 드래그도 브라우저가 스냅으로 한 장면을 통째로 넘겨 버린 뒤 같은
 * 제스처가 클릭으로도 잡혀 두 장면씩 건너뛴다. 여기서는 터치를 직접 가로채
 * (preventDefault) 한 제스처당 정확히 한 번만 반응한다. 마우스 클릭은 그대로
 * 각 장면의 onClick 이 처리한다(터치가 아니라 겹치지 않음).
 */
export function useSceneTouchNav<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  canAdvance: boolean
) {
  const canAdvanceRef = useRef(canAdvance);
  canAdvanceRef.current = canAdvance;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let startY = 0;

    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0;
    };

    // 스크롤 스냅이 같은 제스처에 또 반응하지 않도록 브라우저 기본 동작을 막는다
    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      // 뒤이어 합성되는 click 이벤트로 한 번 더 반응하지 않게 막는다
      event.preventDefault();

      const endY = event.changedTouches[0]?.clientY ?? startY;
      const delta = startY - endY; // 양수 = 위로 이동(다음), 음수 = 아래로 이동(이전)

      if (delta < -SWIPE_THRESHOLD_PX) {
        backScene();
        return;
      }

      if (canAdvanceRef.current) advanceScene();
    };

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref]);
}
