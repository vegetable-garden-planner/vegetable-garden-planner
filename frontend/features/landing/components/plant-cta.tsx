"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { TransitionLink } from "@/components/transition-link";
import { START_PATH } from "../landing-config";

/**
 * 심어보기 버튼
 *
 * 히어로와 마지막 장면이 같은 것을 쓴다. 사이트 전체의 반응이 하나로 읽혀야
 * 하므로 인터랙션을 한 곳에만 둔다.
 *
 *   · 안쪽 배경이 아래에서 차오른다
 *   · 글자가 살짝 왼쪽으로, 화살표는 밀려나가고 새 화살표가 들어온다
 *   · 최대 6px 만 기우는 아주 약한 자석 반응 (커서를 따라다니지 않는다)
 */
export function PlantCta({
  label = "심어보기",
  size = "md",
}: {
  label?: string;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const moveX = gsap.quickTo(element, "x", { duration: 0.5, ease: "power3" });
      const moveY = gsap.quickTo(element, "y", { duration: 0.5, ease: "power3" });

      const onMove = (event: PointerEvent) => {
        const box = element.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        moveX(gsap.utils.clamp(-6, 6, dx * 0.18));
        moveY(gsap.utils.clamp(-6, 6, dy * 0.3));
      };

      const onLeave = () => {
        moveX(0);
        moveY(0);
      };

      element.addEventListener("pointermove", onMove);
      element.addEventListener("pointerleave", onLeave);

      return () => {
        element.removeEventListener("pointermove", onMove);
        element.removeEventListener("pointerleave", onLeave);
      };
    }, element);

    return () => context.revert();
  }, []);

  const tall = size === "lg";

  return (
    <span ref={ref} className="inline-block will-change-transform">
      <TransitionLink
        href={START_PATH}
        className={`group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-lp-brand text-white ${
          tall ? "h-[68px] pl-10 pr-7 lp-type-card" : "h-[58px] pl-8 pr-6 lp-type-card"
        }`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 origin-bottom scale-y-0 bg-lp-brand-deep transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100"
        />
        <span className="relative transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-1">
          {label}
        </span>
        <span
          className={`relative grid place-items-center overflow-hidden rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 ${
            tall ? "h-11 w-11" : "h-9 w-9"
          }`}
        >
          <Arrow className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[150%]" />
          <Arrow className="absolute -translate-x-[150%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0" />
        </span>
      </TransitionLink>
    </span>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={`h-3.5 w-3.5 ${className}`}>
      <path
        d="M3 8h10m0 0L9 4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
