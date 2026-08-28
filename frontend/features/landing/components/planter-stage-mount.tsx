"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * 스크롤 3D 무대를 언제 띄울지 정하는 자리
 *
 * - 데스크톱(1024px 이상)에서만 띄운다.
 *   모바일은 기존처럼 본문 안의 정지 3D를 쓴다. 좁은 화면에서 글 뒤로
 *   오브젝트가 지나가면 읽기가 나빠지고, 캔버스를 두 개 띄울 필요도 없다.
 * - "모션 최소화"를 켠 사용자에게는 띄우지 않는다.
 * - three(약 550KB)는 첫 화면에 필요 없다.
 *   3번 장면이 두 화면 앞으로 다가왔을 때 비로소 받아 온다.
 *   그래서 첫 진입이 무거워지지 않는다.
 */
const PlanterStage = dynamic(() => import("./planter-stage"), { ssr: false });

export function PlanterStageMount() {
  const [allowed, setAllowed] = useState(false);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setAllowed(wide.matches && !still.matches);
    update();

    wide.addEventListener("change", update);
    still.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      still.removeEventListener("change", update);
    };
  }, []);

  // 3번 장면이 가까워지면 그때 three 를 받는다
  useEffect(() => {
    if (!allowed || near) return;

    const target = document.getElementById("scene-how");
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200% 0px 200% 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [allowed, near]);

  if (!allowed || !near) return null;
  return <PlanterStage />;
}
