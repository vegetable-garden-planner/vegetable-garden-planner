import * as THREE from "three";
import { seeded } from "./planter-scene";

/**
 * 캔버스로 만드는 텍스처들
 *
 * planter-scene.ts 는 DOM 을 쓰지 않아야 하므로(형태 검증을 따로 돌린다)
 * 브라우저가 필요한 것만 여기로 뺐다.
 * 정적 3D(planter-3d)와 스크롤 무대(planter-stage)가 함께 쓴다.
 */

/**
 * 흙의 미세한 얼룩.
 * 입자를 수천 개 만들지 않고 작은 캔버스 한 장으로 처리한다.
 * 같은 이미지를 map 과 bumpMap 에 함께 써서 표면에 아주 약한 요철을 준다.
 */
export function makeSoilTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#584032";
  ctx.fillRect(0, 0, size, size);

  const rand = seeded(20260821);

  for (let i = 0; i < 1400; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 2 + rand() * 11;

    ctx.globalAlpha = 0.05 + rand() * 0.12;
    ctx.fillStyle = rand() > 0.45 ? "#2A1D14" : "#7A5C46";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1.2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * HDR 파일 없이 캔버스 그라디언트 한 장으로 환경광을 만든다.
 * 이게 있어야 무광 재질의 면이 밋밋하게 죽지 않는다.
 */
export function makeEnvironment(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "#F4F7F1"); // 위쪽 밝은 하늘
  gradient.addColorStop(0.45, "#C3D3C6");
  gradient.addColorStop(0.72, "#5C7264");
  gradient.addColorStop(1, "#16241C"); // 아래쪽 어두운 바닥
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 128);

  const source = new THREE.CanvasTexture(canvas);
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(source).texture;

  source.dispose();
  pmrem.dispose();
  return environment;
}
