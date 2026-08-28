"use client";

import { useEffect } from "react";

/**
 * 랜딩이 화면에 있는 동안에만 필요한 전역 설정
 *
 * html.lp-snap — 장면 스크롤 스냅과 랜딩 배경색.
 * mount 될 때 붙이고 unmount 될 때 반드시 되돌린다. 그래서 /start, /dashboard
 * 등 기존 서비스 화면에는 랜딩 스크롤 동작이 새어 나가지 않는다.
 *
 * 서체(Pretendard / Gugi)는 이제 app/layout.tsx 에서 서비스 전체가 한 번만
 * 로드하므로 여기서 따로 주입하지 않는다.
 */
export function useLandingChrome() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("lp-snap");
    return () => root.classList.remove("lp-snap");
  }, []);
}
