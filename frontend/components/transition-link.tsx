"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useSceneTransition } from "./scene-transition";

/**
 * 장면 전환이 있는 링크
 *
 * 실제 연출은 root layout 의 SceneTransitionProvider 가 담당한다.
 * Provider 가 없거나 모션 최소화 설정이면 일반 이동으로 떨어진다.
 */
export function TransitionLink({
  href,
  className,
  children,
  ariaDisabled,
  tabIndex,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  ariaDisabled?: boolean;
  tabIndex?: number;
}) {
  const router = useRouter();
  const navigate = useSceneTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (ariaDisabled) {
      event.preventDefault();
      return;
    }

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();

    if (navigate) navigate(href);
    else router.push(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      aria-disabled={ariaDisabled}
      tabIndex={tabIndex}
    >
      {children}
    </a>
  );
}
