"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import {
  applyBuildProgress,
  applyShot,
  buildPlanterScene,
  CAMERA_FOV,
  PLANTER_KEYFRAMES,
  samplePlanterKeyframe,
  type PlanterKeyframe,
} from "../lib/planter-scene";
import { getBuildProgress, onBuildProgress } from "../lib/build-signal";
import { makeEnvironment, makeSoilTexture } from "../lib/planter-textures";

/**
 * 장면에 반응하는 3D 무대
 *
 * 화분 모델(lib/planter-scene.ts)은 그대로 쓰고, 여기서는
 * 카메라·회전·조명·불투명도를 장면에 맞춰 옮긴다.
 *
 * 스크롤을 굴리는 만큼 따라오는 방식이 아니다.
 * 스냅으로 한 장면에 멈추면 그 장면의 컷으로 부드럽게 이동한다.
 *
 *   scene-how     계산이 100% 로 끝난 뒤에 등장한다.
 *                 지어지는 만큼 위에서 천천히 내려앉는다.
 *                 (도면 → 심을 자리 표식 → 성장도 같은 값이 몬다)
 *   scene-result  숫자에 자리를 내주고 오른쪽으로 물러난다
 *   scene-start   완전히 비운다
 *
 * 성능 규칙
 * - React state 를 쓰지 않는다. 스크롤마다 리렌더가 일어나면 안 된다.
 * - GSAP 이 값을 바꿀 때만 프레임이 돈다. 멈추면 루프도 멈춘다.
 * - 화면 밖이면 아무것도 그리지 않는다.
 */

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/** 각 장면이 머무는 카메라 위치 (PLANTER_KEYFRAMES 상의 지점) */
const STOP = {
  /** 계산이 끝났을 때 도달하는 3/4 제품 컷 */
  how: 0.45,
  /** 결과 — 오른쪽으로 물러난 컷 */
  result: 0.78,
  /** 마지막 — 뒤로 빠지며 사라진다 */
  out: 1,
};

export default function PlanterStage() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    gsap.registerPlugin(ScrollTrigger);

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

    renderer.setClearAlpha(0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.opacity = "0";
    host.appendChild(canvas);

    const soilTexture = makeSoilTexture();
    const planter = buildPlanterScene(soilTexture);
    const { scene, bounds, target, root, lights, effects } = planter;

    const environment = makeEnvironment(renderer);
    if (environment) scene.environment = environment;

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 120);

    /*
      워밍업.
      첫 렌더에서 셰이더를 컴파일하느라 화면이 한 번 멈춘다.
      화분이 등장하는 그 순간에 멈추면 "턴 있다가 끊기고 등장"처럼 보인다.
      마운트 직후 미리 컴파일해 두고 그림자 맵도 한 번 채워 둔다.
    */
    renderer.setSize(2, 2, false);
    camera.aspect = 1;
    applyShot(camera, bounds, target, shot0());
    renderer.compile(scene, camera);
    renderer.render(scene, camera);

    /* --------------------------- 상태 (ref 만) --------------------------- */

    const shot: PlanterKeyframe = { ...PLANTER_KEYFRAMES[0] };
    /** 워밍업용 — 중간쯤 컷으로 한 번 컴파일해 둔다 */
    function shot0() {
      return samplePlanterKeyframe(0.45, { ...PLANTER_KEYFRAMES[0] });
    }

    /** 사용자가 직접 돌린 각도 */
    const user = { spin: 0, tilt: 0 };
    /*
      GSAP 이 만지는 값. 카메라와 불투명도를 따로 둔다.
      한 객체에 묶으면 overwrite 때문에 서로의 트윈을 죽인다.
    */
    const cam = { t: 0 };
    const view = { fade: 0 };
    let build = getBuildProgress();
    let revealed = false;
    let stage: "before" | "how" | "result" | "out" = "before";
    let width = 0;
    let height = 0;
    let queued = 0;
    let disposed = false;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === width && h === height) return;
      width = w;
      height = h;
      if (w === 0 || h === 0) return;

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, w < 900 ? 1.6 : 2)
      );
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
    };

    const render = () => {
      queued = 0;
      if (disposed) return;
      resize();
      if (width === 0 || height === 0) return;

      samplePlanterKeyframe(cam.t, shot);

      // 직접 돌린 만큼 더한다. 구도 계산에도 같이 넣어야 잘리지 않는다.
      shot.spin += user.spin;
      shot.elevation = clamp(shot.elevation + user.tilt, 6, 74);

      root.rotation.y = shot.spin;
      applyShot(camera, bounds, target, shot);

      // 도면 → 표식 → 성장. 계산 게이지가 모는 부분이다.
      applyBuildProgress(effects, build);

      lights.key.intensity = shot.keyLight;
      lights.hemi.intensity = shot.hemiLight;
      lights.rim.intensity = mix(
        0.42,
        0.72,
        clamp01((40 - shot.elevation) / 26)
      );
      scene.environmentIntensity = shot.environment;

      renderer.render(scene, camera);

      canvas.style.opacity = String(shot.opacity * view.fade);
    };

    /** 같은 프레임에 두 번 그리지 않는다 */
    const draw = () => {
      if (queued || disposed) return;
      queued = requestAnimationFrame(render);
    };

    /*
      장면 사이 이동.
      스냅으로 화면이 딱 멈춘 직후라 여기서 급하게 움직이면 튀어 보인다.
      길게, 양끝을 죽여서 옮긴다.
    */
    const moveCamera = (t: number, duration = 2.4) => {
      gsap.to(cam, {
        t,
        duration,
        ease: "power3.inOut",
        overwrite: true,
        onUpdate: draw,
        onComplete: draw,
      });
    };

    const fadeTo = (fade: number, duration = 1.4) => {
      gsap.to(view, {
        fade,
        duration,
        ease: "power2.out",
        overwrite: true,
        onUpdate: draw,
        onComplete: draw,
      });
    };

    /* ------------------------------ 장면 감지 ------------------------------ */

    const triggers: ScrollTrigger[] = [];

    const watch = (id: string, onActive: () => void, onBack?: () => void) => {
      const element = document.getElementById(id);
      if (!element) return;
      triggers.push(
        ScrollTrigger.create({
          trigger: element,
          start: "top 60%",
          end: "bottom 40%",
          onToggle: (self) => {
            if (self.isActive) onActive();
            else if (self.direction < 0) onBack?.();
          },
        })
      );
    };

    watch(
      "scene-how",
      () => {
        stage = "how";
        // 아직 계산이 끝나지 않았으면 화면에 아무것도 없다
        if (build > 0.001) {
          revealed = true;
          fadeTo(1);
          moveCamera(build * STOP.how, 1.6);
        }
      },
      () => {
        // 질문 장면으로 되돌아가면 화면에서 비운다
        stage = "before";
        revealed = false;
        fadeTo(0, 0.9);
      }
    );

    watch("scene-result", () => {
      stage = "result";
      fadeTo(1);
      moveCamera(STOP.result);
    });

    watch("scene-start", () => {
      stage = "out";
      fadeTo(0, 1.6);
      moveCamera(STOP.out, 2.2);
    });

    /*
      화분이 지어지는 진행도.
      계산이 끝난 뒤에야 0 에서 출발하므로, 여기서 처음 나타난다.
      카메라는 이 값을 그대로 따라간다 (값 자체가 이미 부드럽다).
    */
    const unsubscribe = onBuildProgress((value) => {
      build = value;

      /*
        화분이 지어지기 시작하면 무조건 나타난다.
        전에는 stage 가 "how" 일 때만 열었는데, ScrollTrigger 의 onToggle 은
        "바뀔 때"만 불린다. 무대가 뒤늦게 마운트되면(dynamic + matchMedia)
        이미 그 구간에 서 있어도 toggle 이 오지 않아 끝내 안 나타났다.
      */
      if (!revealed && value > 0.001) {
        revealed = true;
        fadeTo(1, 1);
      }

      // 결과 구간으로 넘어간 뒤에는 카메라를 건드리지 않는다
      if (stage !== "result" && stage !== "out") {
        gsap.killTweensOf(cam);
        cam.t = value * STOP.how;
      }
      draw();
    });

    /* ------------------------------ 직접 돌리기 ------------------------------ */
    /*
      화분을 잡아서 돌린다.

      캔버스는 본문(z-10) 뒤(z-5)에 있어서 포인터 이벤트가 닿지 않는다.
      섹션 div 가 화면을 통째로 덮고 있기 때문이다.
      캔버스를 앞으로 올리면 글자와 링크를 가로채므로, 대신 window 에서
      받아서 여기서 직접 판단한다.

      · 화분이 보일 때만 반응한다
      · 링크·버튼 위에서 시작한 건 무시한다
      · 4px 이상 움직여야 드래그로 친다 (클릭은 그대로 살아 있다)
    */

    const INTERACTIVE = "a,button,input,textarea,select,label,[role='button']";

    let pending = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let velocity = 0;

    const endDrag = () => {
      pending = false;
      if (!dragging) return;
      dragging = false;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");

      // 끌던 속도만큼 조금 더 돌다 멈춘다
      if (Math.abs(velocity) > 0.0015) {
        gsap.to(user, {
          spin: clamp(user.spin + velocity * 14, -1.15, 1.15),
          duration: 1.4,
          ease: "power3.out",
          onUpdate: draw,
        });
      }
    };

    const onDown = (event: PointerEvent) => {
      if (view.fade < 0.4) return;
      const target = event.target as Element | null;
      if (target?.closest?.(INTERACTIVE)) return;

      pending = true;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      velocity = 0;
      gsap.killTweensOf(user);
    };

    const onDrag = (event: PointerEvent) => {
      if (!pending) return;

      if (!dragging) {
        const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
        if (moved < 4) return;
        dragging = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }

      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;

      velocity = dx * 0.006;
      user.spin = clamp(user.spin + velocity, -1.15, 1.15);
      user.tilt = clamp(user.tilt - dy * 0.12, -16, 26);
      draw();
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    /*
      onToggle 만 믿지 않는다. 마운트 시점에 이미 어느 구간에 서 있는지
      화면 좌표로 직접 확인한다.
    */
    const syncStage = () => {
      const mid = window.innerHeight * 0.5;
      const at = (id: string) => {
        const box = document.getElementById(id)?.getBoundingClientRect();
        return box ? box.top <= mid && box.bottom >= mid : false;
      };

      if (at("scene-start")) stage = "out";
      else if (at("scene-result")) stage = "result";
      else if (at("scene-how")) stage = "how";
      else stage = "before";

      if (build > 0.001 && (stage === "how" || stage === "result")) {
        revealed = true;
        view.fade = 1;
        cam.t = stage === "result" ? STOP.result : build * STOP.how;
        draw();
      }
    };

    syncStage();

    const onResize = () => {
      draw();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);

    const observer = new ResizeObserver(draw);
    observer.observe(host);

    draw();

    return () => {
      disposed = true;
      unsubscribe();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onDrag);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      triggers.forEach((trigger) => trigger.kill());
      gsap.killTweensOf(cam);
      gsap.killTweensOf(view);
      gsap.killTweensOf(user);
      if (queued) cancelAnimationFrame(queued);

      planter.dispose();
      soilTexture?.dispose();
      environment?.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[5]"
    />
  );
}
