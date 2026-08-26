"use client";

import { useEffect, useState } from "react";

const SCENES = [
  { id: "scene-hero", index: "01", label: "시작" },
  { id: "about", index: "02", label: "고민" },
  { id: "scene-how", index: "03", label: "하는 일" },
  { id: "scene-result", index: "04", label: "결과" },
  { id: "scene-start", index: "05", label: "시작하기" },
];

/**
 * 왼쪽 세로 인덱스
 *
 * 다섯 장면이 하나의 흐름이라는 것을 계속 보여 주는 장치다.
 * 스크롤 위치에 따라 현재 장면이 표시되고, 클릭하면 그 장면으로 이동한다.
 */
export function SceneRail() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.45;
      let current = 0;

      SCENES.forEach((scene, index) => {
        const element = document.getElementById(scene.id);
        if (element && element.getBoundingClientRect().top <= line) {
          current = index;
        }
      });

      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav
      aria-label="장면 이동"
      className="fixed left-10 top-1/2 z-40 hidden w-[120px] -translate-y-1/2 xl:block 2xl:left-14"
    >
      <ol className="flex flex-col gap-6">
        {SCENES.map((scene, index) => {
          const isActive = index === active;

          return (
            <li key={scene.id}>
              <a
                href={`#${scene.id}`}
                className="group flex items-center gap-3"
                aria-current={isActive ? "true" : undefined}
              >
                <span
                  className="block h-px transition-all duration-500 ease-out"
                  style={{
                    width: isActive ? 28 : 12,
                    backgroundColor: isActive
                      ? "var(--color-lp-brand-soft)"
                      : "rgba(255,255,255,0.25)",
                  }}
                />
                <span
                  className="lp-type-label-en transition-colors duration-500"
                  style={{
                    color: isActive
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.3)",
                  }}
                >
                  {scene.index}
                  <span
                    className="ml-2 transition-opacity duration-500"
                    style={{ opacity: isActive ? 1 : 0 }}
                  >
                    {scene.label}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
