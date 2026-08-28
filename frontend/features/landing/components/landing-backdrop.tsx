"use client";

import { usePageProgress } from "../hooks/use-motion";

/**
 * 랜딩 전체를 덮는 하나의 배경
 *
 * 섹션마다 배경 블록을 따로 두면 경계선이 보여 장면이 끊긴다.
 * 화면에 고정된 배경 하나를 두고, 스크롤에 따라 빛의 위치와 색만 바꾼다.
 */
export function LandingBackdrop() {
  const p = usePageProgress();

  return (
    <div aria-hidden="true" className="lp-grain fixed inset-0 z-0 bg-lp-forest">
      {/* 창으로 드는 빛 — 스크롤에 따라 화면을 가로질러 이동한다 */}
      <div
        className="absolute inset-0 transition-none"
        style={{
          background: `radial-gradient(58% 46% at ${72 - p * 44}% ${
            16 + p * 30
          }%, rgba(70,177,141,${0.26 + p * 0.1}), transparent 68%)`,
        }}
      />
      {/* 아래쪽에 깔리는 따뜻한 톤 — 뒤로 갈수록 짙어진다 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(80% 55% at ${28 + p * 40}% ${
            96 - p * 22
          }%, rgba(255,194,131,${0.06 + p * 0.09}), transparent 66%)`,
        }}
      />
      {/* 전체 밝기 — 중반부에서 가장 밝고 끝에서 다시 가라앉는다 */}
      <div
        className="absolute inset-0 bg-lp-brand-soft"
        style={{ opacity: 0.05 + Math.sin(p * Math.PI) * 0.07 }}
      />
    </div>
  );
}
