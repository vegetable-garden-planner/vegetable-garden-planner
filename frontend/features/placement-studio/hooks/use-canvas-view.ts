"use client";

import { useEffect, useState } from "react";
import { planterSize, type StudioPlanter } from "@/features/placement-studio/domain/studio-model";

/** 프로토타입과 같은 확대 한계 */
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.2;
const FIT_MAX_ZOOM = 1.25;

export interface ViewTransform { zoom: number; x: number; y: number }

const INITIAL: ViewTransform = { zoom: 1, x: 0, y: 0 };

/**
 * 캔버스 확대·이동
 *
 * 프로토타입의 setTransform / zoomAt / fitView / resetView 를 그대로 옮겼다.
 * transform 은 stage 하나에만 걸리고, 작물 위치는 픽셀이 아니라 칸이라
 * 확대해도 배치가 흐트러지지 않는다.
 */
export function useCanvasView(viewport: React.RefObject<HTMLDivElement | null>) {
  const [view, setView] = useState<ViewTransform>(INITIAL);

  function reset() {
    setView(INITIAL);
  }

  function zoomAt(clientX: number, clientY: number, delta: number) {
    const box = viewport.current?.getBoundingClientRect();
    if (!box) return;
    setView((current) => {
      const mx = clientX - box.left;
      const my = clientY - box.top;
      const wx = (mx - current.x) / current.zoom;
      const wy = (my - current.y) / current.zoom;
      const zoom = clamp(current.zoom + delta, MIN_ZOOM, MAX_ZOOM);
      return { zoom, x: mx - wx * zoom, y: my - wy * zoom };
    });
  }

  function zoomCentre(delta: number) {
    const box = viewport.current?.getBoundingClientRect();
    if (!box) return;
    zoomAt(box.left + box.width / 2, box.top + box.height / 2, delta);
  }

  function panBy(dx: number, dy: number) {
    setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
  }

  /**
   * 화분 전체가 보이도록 맞춘다. 실제로 맞췄으면 true 를 돌려준다.
   * topInset 은 캔버스 위에 떠 있는 안내 막대가 화분을 가리지 않게 비워 둘 높이다.
   */
  function fit(planters: readonly StudioPlanter[], topInset = 0): boolean {
    const box = viewport.current?.getBoundingClientRect();
    if (!box || box.width < 40 || box.height < 40) return false;
    if (planters.length === 0) { setView(INITIAL); return true; }

    const bounds = boundsOf(planters);
    const zoom = clamp(
      Math.min(
        (box.width - 80) / (bounds.maxX - bounds.minX),
        (box.height - 80 - topInset) / (bounds.maxY - bounds.minY),
      ),
      MIN_ZOOM,
      FIT_MAX_ZOOM,
    );
    setView({ zoom, x: 40 - bounds.minX * zoom, y: 40 + topInset - bounds.minY * zoom });
    return true;
  }

  /** 화분 하나를 화면 안으로 가져온다. (레이어 목록에서 눌렀을 때) */
  function focus(planter: StudioPlanter) {
    setView((current) => {
      const zoom = Math.max(0.7, current.zoom);
      return { zoom, x: 80 - planter.x * zoom, y: 100 - planter.y * zoom };
    });
  }

  // 휠 확대. passive:false 가 필요해 직접 붙인다.
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 0.1 : -0.1);
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  });

  return { view, reset, zoomAt, zoomCentre, panBy, fit, focus };
}

function boundsOf(planters: readonly StudioPlanter[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const planter of planters) {
    const size = planterSize(planter);
    minX = Math.min(minX, planter.x - 45);
    minY = Math.min(minY, planter.y - 55);
    maxX = Math.max(maxX, planter.x + size.w + 45);
    maxY = Math.max(maxY, planter.y + size.h + 45);
  }

  return { minX, minY, maxX, maxY };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
