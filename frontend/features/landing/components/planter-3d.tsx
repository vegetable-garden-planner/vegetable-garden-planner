"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { buildPlanterScene, CAMERA_FOV, fitCamera } from "../lib/planter-scene";
import { makeEnvironment, makeSoilTexture } from "../lib/planter-textures";

/**
 * 베란다 플랜터 3D — 정지 컷
 *
 * 형태와 조명은 lib/planter-scene.ts 에 있고, 여기서는
 * 렌더러 · 환경맵 · 크기 대응만 담당한다.
 *
 * 애니메이션 루프를 돌리지 않고 처음 한 번과 크기가 바뀔 때만 렌더한다.
 * 스크롤 연출이 도는 화면에서는 planter-stage 가 대신 쓰이고,
 * 이 컴포넌트는 모바일과 "모션 최소화" 설정에서 쓰인다.
 */

/**
 * WebGL 을 쓸 수 있는지 미리 본다.
 * 렌더 중에 판정해 두면 effect 안에서 상태를 바꾸지 않아도 된다.
 * (이 컴포넌트는 ssr:false 로 불러오므로 브라우저에서만 실행된다)
 */
function canUseWebGL() {
  if (typeof window === "undefined") return true;
  try {
    const probe = document.createElement("canvas");
    return Boolean(
      probe.getContext("webgl2") ?? probe.getContext("webgl")
    );
  } catch {
    return false;
  }
}

export default function Planter3D({
  className = "",
  fallbackSrc,
  alt = "상추와 쪽파가 심긴 베란다 플랜터",
}: {
  className?: string;
  fallbackSrc?: string;
  alt?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [supported] = useState(canUseWebGL);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setClearAlpha(0); // 배경은 페이지 색이 그대로 보이게
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    host.appendChild(canvas);

    const soilTexture = makeSoilTexture();
    const { scene, bounds, target, dispose } = buildPlanterScene(soilTexture);

    const environment = makeEnvironment(renderer);
    if (environment) {
      scene.environment = environment;
      scene.environmentIntensity = 0.5;
    }

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);

    let frame = 0;

    const render = () => {
      frame = 0;

      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width === 0 || height === 0) return;

      // 모바일에서 과한 해상도로 그리지 않되 흐릿해지지도 않게
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, width < 480 ? 1.75 : 2)
      );
      renderer.setSize(width, height, false);

      camera.aspect = width / height;
      fitCamera(camera, bounds, target);

      renderer.render(scene, camera);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(render);
    };

    schedule();

    const observer = new ResizeObserver(schedule);
    observer.observe(host);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);

      dispose();
      soilTexture?.dispose();
      environment?.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [supported]);

  if (!supported) {
    return fallbackSrc ? (
      <img
        src={fallbackSrc}
        alt={alt}
        className={`w-full select-none ${className}`}
        draggable={false}
      />
    ) : null;
  }

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={alt}
      className={`w-full ${className}`}
    />
  );
}
