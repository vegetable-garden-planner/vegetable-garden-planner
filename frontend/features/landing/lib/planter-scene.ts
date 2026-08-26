import * as THREE from "three";

/**
 * 심어봄 베란다 플랜터 — 3D 장면 구성
 *
 * 외부 GLB/GLTF 없이 three.js 기본 geometry 조합만으로 만든다.
 * 폴리곤을 늘려 완성도를 올리지 않고 비율·베벨·재질·조명·카메라로 만든다.
 *
 * DOM 을 쓰지 않는다. 렌더러·캔버스·환경맵은 컴포넌트가 담당한다.
 * (그래야 이 파일만 따로 실행해 형태를 검증할 수 있다)
 *
 * 단위는 1 = 10cm 정도로 잡았다. (플랜터 폭 6.0 ≈ 60cm)
 */

/* ------------------------------ 색 ------------------------------ */
/*
  ACES 톤매핑을 거치면 조금 어두워지므로 원본 색은 살짝 높게 잡는다.
  페이지의 딥그린(#06170f) 위에서 겉돌지 않도록 채도를 낮춘 계열로 맞췄다.
*/
export const PLANTER_COLOR = {
  planter: "#7E9B77", // 채도 낮은 세이지 그린
  planterRim: "#88A681", // 림은 아주 살짝 밝게
  soil: "#33261D", // 아주 어두운 갈색
  lettuce: "#A8D45C", // 플랜터보다 밝은 옐로 그린
  sprout: "#7FD173", // 중간 그린
  chive: "#45BC4E", // 조금 더 짙은 그린
};

/* ---------------------------- 치수 ---------------------------- */

const W = 6.0; // 전체 가로
const D = 1.85; // 전체 세로(깊이)
const H = 1.95; // 전체 높이

const RIM_H = 0.26; // 상단 림 높이
const RIM_T = 0.24; // 상단 림 두께
const BODY_W = W - 0.28; // 본체는 림보다 좁다 → 림이 밖으로 걸린다
const BODY_D = D - 0.28;
const BODY_H = 1.72;

const SOIL_TOP = 1.82; // 흙 표면 높이 (림 안쪽에 잠긴다)

/** 아래로 갈수록 아주 미세하게 좁아진다 */
const TAPER_X = 0.955;
const TAPER_Z = 0.9;

/* --------------------------- 작은 도구 --------------------------- */

/** 같은 결과가 나오도록 고정 시드 난수 */
export function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 모서리가 둥근 사각형 */
function roundedRect(w: number, d: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;

  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + d - r);
  shape.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + d);
  shape.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);

  return shape;
}

/**
 * 둥근 사각형을 위로 뽑아 올린다.
 * bevel 을 켜서 위아래 모서리에 실제 곡률이 생기게 한다.
 */
function extrudeUp(
  shape: THREE.Shape,
  height: number,
  bevel: number,
  holes?: THREE.Path[],
  /** 옆면을 세로로 몇 단으로 나눌지. 정점 색 그늘이 부드럽게 이어지려면 필요하다 */
  steps = 1
) {
  if (holes) shape.holes = holes;

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(height - bevel * 2, 0.01),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 3,
    curveSegments: 16,
    steps,
  });

  geo.rotateX(-Math.PI / 2); // 뽑아 올린 방향을 +Y 로
  geo.computeBoundingBox();
  geo.translate(0, -(geo.boundingBox?.min.y ?? 0), 0); // 바닥을 y=0 에
  return geo;
}

/** 아래로 갈수록 좁아지게 정점을 눌러 준다 */
function taper(geo: THREE.BufferGeometry, sx: number, sz: number) {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return geo;

  const bottom = box.min.y;
  const span = Math.max(box.max.y - bottom, 0.0001);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i += 1) {
    const t = (pos.getY(i) - bottom) / span; // 0 = 바닥, 1 = 윗면
    pos.setX(i, pos.getX(i) * (sx + (1 - sx) * t));
    pos.setZ(i, pos.getZ(i) * (sz + (1 - sz) * t));
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------- 가짜 앰비언트 오클루전 ------------------------- */
/*
  후처리 AO 없이 정점 색으로 그늘을 구워 넣는다.
  이게 없으면 큰 면이 균일하게 칠해져 플라스틱 판처럼 납작해 보인다.
  정점 색은 재질 색에 곱해진다.
*/

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/** 하나의 밝기 값을 지오메트리 전체에 심는다 */
function bakeFlatShade(geo: THREE.BufferGeometry, shade: number) {
  const count = geo.getAttribute("position").count;
  const colors = new Float32Array(count * 3).fill(shade);
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** 바닥 접지와 림 아래 그늘을 높이 기준으로 심는다 */
function bakeBodyShade(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return geo;

  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const span = Math.max(box.max.y - box.min.y, 0.0001);
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i += 1) {
    const t = (pos.getY(i) - box.min.y) / span;
    // 바닥으로 갈수록 어두워지고, 림 바로 아래에도 그늘이 진다
    let shade = 0.58 + 0.42 * smoothstep(0, 0.38, t);
    shade *= 1 - 0.2 * smoothstep(0.84, 1, t);
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade;
    colors[i * 3 + 2] = shade;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** 흙은 벽에 가까울수록 어두워진다 */
function bakeSoilShade(geo: THREE.BufferGeometry, halfW: number, halfD: number) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i += 1) {
    const u = Math.abs(pos.getX(i)) / halfW;
    const v = Math.abs(pos.getZ(i)) / halfD;
    const edge = Math.max(u, v);
    const shade = 0.5 + 0.5 * (1 - smoothstep(0.55, 1, edge));
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade;
    colors[i * 3 + 2] = shade;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

/* ----------------------------- 잎 ----------------------------- */

/**
 * 잎 한 장.
 * 평평한 판이 아니라 두께와 오목한 곡면을 가진다.
 *
 * 만들어진 뒤에는 XZ 평면에 눕고, 긴 축이 +Z, 오목한 쪽이 +Y 를 향한다.
 */
function makeLeaf(halfWidth: number, halfLength: number, cup: number) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, halfWidth, halfLength, 0, Math.PI * 2, false, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.016,
    bevelOffset: 0,
    bevelSegments: 2,
    curveSegments: 16,
    steps: 1,
  });

  geo.center();

  // 바깥으로 갈수록 들려 올라가는 오목한 면
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const d =
      (x * x) / (halfWidth * halfWidth) + (y * y) / (halfLength * halfLength);
    pos.setZ(i, pos.getZ(i) + cup * d);
  }
  pos.needsUpdate = true;

  geo.rotateX(-Math.PI / 2); // 눕힌다
  geo.rotateY(Math.PI); // 긴 축을 +Z 로
  geo.computeVertexNormals();
  return geo;
}

/** 잎을 원형으로 세워 한 포기를 만든다 */
function makeLettuce(material: THREE.Material, seed: number, scale: number) {
  const group = new THREE.Group();
  const rand = seeded(seed);

  /*
    바깥 → 안쪽. 장수를 늘리지 않고 층으로 밀도를 만든다.
    tilt 은 잎이 서는 각도다. 바깥은 눕고 안쪽으로 갈수록 세워야
    꽃처럼 납작해지지 않고 오므린 포기로 읽힌다.
  */
  const rings = [
    { count: 6, radius: 0.3, tilt: 0.58, size: 1.0, lift: 0.0, shade: 1.0 },
    { count: 4, radius: 0.165, tilt: 1.0, size: 0.75, lift: 0.14, shade: 0.9 },
    { count: 3, radius: 0.055, tilt: 1.38, size: 0.49, lift: 0.25, shade: 0.8 },
  ];

  for (const ring of rings) {
    const offset = rand() * Math.PI * 2;

    for (let i = 0; i < ring.count; i += 1) {
      // 완전히 똑같이 복제되지 않도록 하나하나 조금씩 흔든다
      const jitterSize = 0.88 + rand() * 0.24;
      const jitterTilt = ring.tilt + (rand() - 0.5) * 0.2;
      const jitterRadius = ring.radius * (0.9 + rand() * 0.2);
      const jitterLift = ring.lift + (rand() - 0.5) * 0.03;
      const angle =
        offset + (i / ring.count) * Math.PI * 2 + (rand() - 0.5) * 0.26;

      const s = ring.size * jitterSize;
      // 안쪽 잎일수록 가려지므로 조금씩 어둡게 굽는다
      const geo = bakeFlatShade(
        makeLeaf(0.29 * s, 0.36 * s, 0.15 * s),
        ring.shade * (0.96 + rand() * 0.08)
      );
      const leaf = new THREE.Mesh(geo, material);

      leaf.rotation.order = "YXZ";
      leaf.rotation.set(-jitterTilt, angle, (rand() - 0.5) * 0.22);
      leaf.position.set(
        Math.sin(angle) * jitterRadius,
        jitterLift,
        Math.cos(angle) * jitterRadius
      );

      leaf.castShadow = true;
      leaf.receiveShadow = true;
      group.add(leaf);
    }
  }

  group.scale.setScalar(scale);
  return group;
}

/* ---------------------------- 새싹 ---------------------------- */

function makeSprout(stemMaterial: THREE.Material, leafMaterial: THREE.Material) {
  const group = new THREE.Group();

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.04, 0.6, 10),
    stemMaterial
  );
  stem.position.y = 0.28;
  stem.castShadow = true;
  group.add(stem);

  // 위 2장 + 아래 2장
  const leaves = [
    { y: 0.58, angle: Math.PI / 2, tilt: -0.4, size: 1.0 },
    { y: 0.58, angle: -Math.PI / 2, tilt: -0.4, size: 0.95 },
    { y: 0.34, angle: Math.PI / 2, tilt: -0.06, size: 0.74 },
    { y: 0.34, angle: -Math.PI / 2, tilt: -0.06, size: 0.7 },
  ];

  for (const item of leaves) {
    const geo = makeLeaf(0.1 * item.size, 0.21 * item.size, 0.04 * item.size);
    const leaf = new THREE.Mesh(geo, leafMaterial);

    leaf.rotation.order = "YXZ";
    leaf.rotation.set(item.tilt, item.angle, 0);
    leaf.position.set(
      Math.sin(item.angle) * 0.2 * item.size,
      item.y,
      Math.cos(item.angle) * 0.2 * item.size
    );
    leaf.castShadow = true;
    group.add(leaf);
  }

  return group;
}

/* ---------------------------- 쪽파 ---------------------------- */

function makeChives(material: THREE.Material) {
  const group = new THREE.Group();
  const rand = seeded(770132);
  const count = 10;

  for (let i = 0; i < count; i += 1) {
    const height = 0.66 + rand() * 0.5;
    const geo = new THREE.CapsuleGeometry(0.034, height, 3, 8);
    const stalk = new THREE.Mesh(geo, material);

    // 과하게 휘지 않게 아주 조금씩만 방향을 준다
    stalk.rotation.order = "YXZ";
    stalk.rotation.set(
      (rand() - 0.5) * 0.18,
      rand() * Math.PI,
      (rand() - 0.5) * 0.24
    );

    // 한 점에 뭉치지 않도록 가로로 조금 더 퍼뜨린다
    const angle = rand() * Math.PI * 2;
    const spread = 0.35 + rand() * 0.65;
    stalk.position.set(
      Math.sin(angle) * 0.3 * spread,
      height / 2 + 0.03,
      Math.cos(angle) * 0.17 * spread
    );

    stalk.castShadow = true;
    group.add(stalk);
  }

  return group;
}

/* -------------------------- 카메라 맞춤 -------------------------- */

export const CAMERA_FOV = 28;

/**
 * 카메라 한 컷.
 *
 * 스크롤 연출은 이 컷들 사이를 오가는 방식으로 만든다.
 * 거리는 직접 정하지 않는다. fill 을 주면 오브젝트가 화면을 그만큼 채우도록
 * 거리를 역산하므로, 화면 비율이 달라져도 잘리지 않는다.
 */
export type PlanterShot = {
  /** 도. 음수면 카메라가 정면 기준 왼쪽에 선다 */
  azimuth: number;
  /** 도. 클수록 위에서 내려다본다 */
  elevation: number;
  /** 화면을 채우는 비율 (0~1). 작을수록 멀어진다 */
  fill: number;
  /** 양수면 오브젝트가 화면 왼쪽으로 간다 (화면 높이 기준) */
  offsetX: number;
  /** 양수면 오브젝트가 화면 위로 간다 */
  offsetY: number;
  /** 오브젝트 자체의 Y 회전 (라디안) */
  spin: number;
};

export const DEFAULT_SHOT: PlanterShot = {
  azimuth: -30,
  elevation: 22,
  fill: 0.9,
  offsetX: 0,
  offsetY: 0,
  spin: 0,
};

const WORLD_UP = new THREE.Vector3(0, 1, 0);

/**
 * 컷 하나를 카메라에 반영한다.
 *
 * 바운딩 박스의 여덟 꼭짓점을 실제로 투영해서 딱 맞는 거리를 찾는다.
 * 화면 밖으로 밀어낸 만큼도 계산에 들어가므로, 오브젝트를 옆으로 치워도
 * 잘리지 않는다.
 */
export function applyShot(
  camera: THREE.PerspectiveCamera,
  box: THREE.Box3,
  center: THREE.Vector3,
  shot: PlanterShot
) {
  const azimuth = THREE.MathUtils.degToRad(shot.azimuth);
  const elevation = THREE.MathUtils.degToRad(shot.elevation);

  const dir = new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation)
  );

  // 오브젝트가 돌아간 상태의 꼭짓점을 써야 회전 중에도 잘리지 않는다
  const cos = Math.cos(shot.spin);
  const sin = Math.sin(shot.spin);
  const corners: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i += 1) {
    const x = i & 1 ? box.max.x : box.min.x;
    const y = i & 2 ? box.max.y : box.min.y;
    const z = i & 4 ? box.max.z : box.min.z;
    corners.push(new THREE.Vector3(x * cos + z * sin, y, -x * sin + z * cos));
  }

  const forward = dir.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, WORLD_UP).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();

  const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
  const aim = new THREE.Vector3();
  let distance = box.getSize(new THREE.Vector3()).length() * 1.6;

  for (let step = 0; step < 7; step += 1) {
    // 화면 한 칸(세로) 이 월드에서 몇인지
    const perScreen = 2 * distance * Math.tan(halfFov);

    aim
      .copy(center)
      .addScaledVector(right, shot.offsetX * perScreen)
      .addScaledVector(up, -shot.offsetY * perScreen);

    camera.position.copy(center).addScaledVector(dir, distance);
    camera.lookAt(aim);
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    camera.updateProjectionMatrix();

    let maxX = 0;
    let maxY = 0;
    for (const corner of corners) {
      const p = corner.clone().project(camera);
      maxX = Math.max(maxX, Math.abs(p.x));
      maxY = Math.max(maxY, Math.abs(p.y));
    }

    const over = Math.max(maxX, maxY) / shot.fill;
    if (Math.abs(over - 1) < 0.004) break;
    distance *= over;
  }
}

/** 움직임 없이 기본 컷으로 맞춘다 */
export function fitCamera(
  camera: THREE.PerspectiveCamera,
  box: THREE.Box3,
  target: THREE.Vector3
) {
  applyShot(camera, box, target, DEFAULT_SHOT);
}

/* --------------------------- 스크롤 카메라 워크 --------------------------- */

/**
 * 소개 페이지 세 섹션을 하나의 카메라 워크로 이어 붙인 컷 목록.
 *
 *   0.00 ~ 0.45  scene-how     위에서 내려다보다가 3/4 제품 컷으로 내려앉는다
 *   0.45 ~ 0.85  scene-result  숫자에 자리를 내주고 오른쪽으로 물러난다
 *   0.85 ~ 1.00  scene-start   뒤로 빠지며 아래로 가라앉는다
 *
 * 여기 값만 고치면 연출이 바뀐다. 컴포넌트에는 타이밍 로직만 둔다.
 */
export type PlanterKeyframe = PlanterShot & {
  at: number;
  opacity: number;
  keyLight: number;
  hemiLight: number;
  environment: number;
};

export const PLANTER_KEYFRAMES: PlanterKeyframe[] = [
  // 등장 — 거의 위에서 내려다본 평면. 치수를 읽는 시점.
  {
    at: 0,
    azimuth: -14,
    elevation: 66,
    fill: 0.46,
    offsetX: 0,
    offsetY: 0.09,
    spin: -0.34,
    opacity: 0.22,
    keyLight: 2.2,
    hemiLight: 0.34,
    environment: 0.62,
  },
  {
    at: 0.18,
    azimuth: -22,
    elevation: 50,
    fill: 0.52,
    offsetX: 0,
    offsetY: 0.09,
    spin: -0.24,
    opacity: 0.68,
    keyLight: 2.5,
    hemiLight: 0.3,
    environment: 0.56,
  },
  {
    at: 0.36,
    azimuth: -28,
    elevation: 31,
    fill: 0.57,
    offsetX: 0,
    offsetY: 0.08,
    spin: -0.12,
    opacity: 1,
    keyLight: 2.9,
    hemiLight: 0.26,
    environment: 0.46,
  },
  // 계산이 끝난 자리 — 정돈된 3/4 제품 컷
  {
    at: 0.45,
    azimuth: -32,
    elevation: 23,
    fill: 0.58,
    offsetX: 0,
    offsetY: 0.08,
    spin: -0.04,
    opacity: 1,
    keyLight: 3.1,
    hemiLight: 0.24,
    environment: 0.42,
  },
  // 결과 — 숫자가 나타나기 전에 먼저 오른쪽으로 비켜선다
  {
    at: 0.51,
    azimuth: -34,
    elevation: 21,
    fill: 0.86,
    offsetX: -0.46,
    offsetY: 0.08,
    spin: 0,
    opacity: 1,
    keyLight: 3.1,
    hemiLight: 0.24,
    environment: 0.42,
  },
  {
    at: 0.58,
    azimuth: -38,
    elevation: 20,
    fill: 0.86,
    offsetX: -0.46,
    offsetY: 0.08,
    spin: 0.04,
    opacity: 1,
    keyLight: 3.1,
    hemiLight: 0.24,
    environment: 0.42,
  },
  {
    at: 0.74,
    azimuth: -45,
    elevation: 17,
    fill: 0.88,
    offsetX: -0.54,
    offsetY: 0.08,
    spin: 0.12,
    opacity: 1,
    keyLight: 3.0,
    hemiLight: 0.26,
    environment: 0.44,
  },
  {
    at: 0.86,
    azimuth: -40,
    elevation: 20,
    fill: 0.82,
    offsetX: -0.54,
    offsetY: 0.02,
    spin: 0.07,
    opacity: 0.92,
    keyLight: 2.7,
    hemiLight: 0.28,
    environment: 0.5,
  },
  // 마지막 — 뒤로 빠지며 가라앉는다
  {
    at: 1,
    azimuth: -30,
    elevation: 30,
    fill: 0.52,
    offsetX: -0.04,
    offsetY: -0.34,
    spin: 0,
    opacity: 0,
    keyLight: 2.3,
    hemiLight: 0.32,
    environment: 0.6,
  },
];

/** 컷 사이를 부드럽게 잇는다 (위쪽 smoothstep 과 인자가 달라 이름을 나눈다) */
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** 진행도 t 에 해당하는 컷을 만들어 낸다 (매 프레임 도므로 새 객체를 만들지 않는다) */
export function samplePlanterKeyframe(t: number, out: PlanterKeyframe) {
  let index = 0;
  while (
    index < PLANTER_KEYFRAMES.length - 2 &&
    PLANTER_KEYFRAMES[index + 1].at < t
  ) {
    index += 1;
  }

  const a = PLANTER_KEYFRAMES[index];
  const b = PLANTER_KEYFRAMES[index + 1];
  const span = Math.max(b.at - a.at, 0.0001);
  const k = easeInOut(Math.min(1, Math.max(0, (t - a.at) / span)));

  out.at = t;
  out.azimuth = mix(a.azimuth, b.azimuth, k);
  out.elevation = mix(a.elevation, b.elevation, k);
  out.fill = mix(a.fill, b.fill, k);
  out.offsetX = mix(a.offsetX, b.offsetX, k);
  out.offsetY = mix(a.offsetY, b.offsetY, k);
  out.spin = mix(a.spin, b.spin, k);
  out.opacity = mix(a.opacity, b.opacity, k);
  out.keyLight = mix(a.keyLight, b.keyLight, k);
  out.hemiLight = mix(a.hemiLight, b.hemiLight, k);
  out.environment = mix(a.environment, b.environment, k);
  return out;
}

/* =========================== 장면 조립 =========================== */

export type PlanterScene = {
  scene: THREE.Scene;
  bounds: THREE.Box3;
  target: THREE.Vector3;
  /** 화분 + 식물을 함께 담은 그룹. 스크롤 연출에서 이걸 돌린다 */
  root: THREE.Group;
  /** 스크롤에 따라 세기를 조절할 조명 */
  lights: {
    key: THREE.DirectionalLight;
    hemi: THREE.HemisphereLight;
    rim: THREE.DirectionalLight;
  };
  /** 재질 전체를 한 번에 흐리게 만들 때 쓴다 */
  materials: THREE.Material[];
  /** 계측 → 파종 → 성장 연출에 쓰는 부분들 */
  effects: PlanterEffects;
  dispose: () => void;
};

export type PlanterEffects = {
  /** 포기별 홀더. scale 을 키우면 자라 오른다 */
  plants: THREE.Group[];
  /** 심을 자리 표식 */
  markers: THREE.Mesh[];
  markerMaterial: THREE.MeshBasicMaterial;
  /** 바닥 그리드와 치수선 */
  lineMaterial: THREE.LineBasicMaterial;
  gridMaterial: THREE.Material;
};

/* ------------------------- 계측 → 파종 → 성장 ------------------------- */

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const range = (v: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (v - a) / (b - a)));

/**
 * "계산 중" 게이지 하나로 도면 → 표식 → 성장을 한 번에 몰고 간다.
 *
 *   0.00 ~ 0.15  바닥 그리드와 치수선이 그려진다
 *   0.10 ~ 0.48  심을 자리에 표식이 하나씩 찍힌다
 *   0.30 ~ 1.00  그 자리에서 포기가 차례로 자라 오른다
 *   0.62 ~ 0.92  도면이 걷히고 표식이 사라진다
 *
 * g 는 0~1. 되돌려도 그대로 역재생된다.
 */
export function applyBuildProgress(effects: PlanterEffects, g: number) {
  const drawIn = range(g, 0, 0.15);
  const clear = range(g, 0.62, 0.92);

  effects.lineMaterial.opacity = 0.75 * drawIn * (1 - clear);
  effects.gridMaterial.opacity = 0.55 * drawIn * (1 - clear);

  const count = Math.max(effects.plants.length, 1);

  effects.markers.forEach((marker, index) => {
    const start = 0.1 + (index / count) * 0.3;
    const pop = easeOut(range(g, start, start + 0.14));
    const fade = range(g, 0.7 + (index / count) * 0.1, 0.95);
    marker.scale.setScalar(Math.max(0.001, pop));
    // 표식은 표식끼리 같은 재질이라 가장 늦게 사라지는 값에 맞춘다
    marker.visible = pop > 0.01 && fade < 1;
  });

  effects.markerMaterial.opacity = 0.85 * (1 - range(g, 0.72, 0.95));

  effects.plants.forEach((plant, index) => {
    const start = 0.3 + (index / count) * 0.34;
    const grown = easeOut(range(g, start, start + 0.34));
    plant.scale.setScalar(Math.max(0.001, grown));
    plant.visible = grown > 0.005;
  });
}

export function buildPlanterScene(soilTexture: THREE.Texture | null): PlanterScene {
  const scene = new THREE.Scene();

  /* ----------------------------- 조명 ----------------------------- */

  const hemi = new THREE.HemisphereLight(0xd8ebe0, 0x0b2016, 0.24);
  scene.add(hemi);

  /*
    카메라는 왼쪽 앞에서 본다. 그래서 key 를 오른쪽 위 앞에 두어야
    보이는 앞면은 밝고 왼쪽 마구리면은 떨어져서 형태가 읽힌다.
    (양쪽에서 고르게 비추면 면이 구분되지 않아 납작해 보인다)
  */
  const key = new THREE.DirectionalLight(0xfff4e2, 3.1);
  key.position.set(4.6, 12.4, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 26;
  key.shadow.camera.left = -4.6;
  key.shadow.camera.right = 4.6;
  key.shadow.camera.top = 3.4;
  key.shadow.camera.bottom = -3.4;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.022;
  key.shadow.radius = 3;
  key.target.position.set(0, 0.9, 0);
  scene.add(key);
  scene.add(key.target);

  // 어두워진 왼쪽 면이 완전히 죽지 않을 만큼만
  const fill = new THREE.DirectionalLight(0xa8d8c4, 0.3);
  fill.position.set(-6.5, 2.2, 3.4);
  scene.add(fill);

  // 뒤쪽 윤곽을 살짝 띄운다
  const rim = new THREE.DirectionalLight(0xbfe9d6, 0.6);
  rim.position.set(-2.4, 3.2, -7.0);
  scene.add(rim);

  /* ----------------------------- 재질 ----------------------------- */

  const planterMaterial = new THREE.MeshStandardMaterial({
    color: PLANTER_COLOR.planter,
    roughness: 0.72,
    metalness: 0,
    vertexColors: true, // 구워 넣은 그늘
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: PLANTER_COLOR.planterRim,
    roughness: 0.68,
    metalness: 0,
  });

  const soilMaterial = new THREE.MeshStandardMaterial({
    color: PLANTER_COLOR.soil,
    roughness: 0.98,
    metalness: 0,
    vertexColors: true,
    ...(soilTexture
      ? { map: soilTexture, bumpMap: soilTexture, bumpScale: 0.35 }
      : {}),
  });

  const lettuceMaterial = new THREE.MeshStandardMaterial({
    color: PLANTER_COLOR.lettuce,
    roughness: 0.58,
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: true,
  });

  const sproutMaterial = new THREE.MeshStandardMaterial({
    color: PLANTER_COLOR.sprout,
    roughness: 0.56,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  const chiveMaterial = new THREE.MeshStandardMaterial({
    color: PLANTER_COLOR.chive,
    roughness: 0.54,
    metalness: 0,
  });

  const materials = [
    planterMaterial,
    rimMaterial,
    soilMaterial,
    lettuceMaterial,
    sproutMaterial,
    chiveMaterial,
  ];

  /* ---------------------------- 플랜터 ---------------------------- */

  const planter = new THREE.Group();
  planter.name = "planter";

  const body = new THREE.Mesh(
    bakeBodyShade(
      taper(
        extrudeUp(roundedRect(BODY_W, BODY_D, 0.22), BODY_H, 0.07, undefined, 10),
        TAPER_X,
        TAPER_Z
      )
    ),
    planterMaterial
  );
  body.castShadow = true;
  body.receiveShadow = true;
  planter.add(body);

  const rimMesh = new THREE.Mesh(
    extrudeUp(roundedRect(W, D, 0.3), RIM_H, 0.055, [
      roundedRect(W - RIM_T * 2, D - RIM_T * 2, 0.18),
    ]),
    rimMaterial
  );
  rimMesh.position.y = H - RIM_H;
  rimMesh.castShadow = true;
  rimMesh.receiveShadow = true;
  planter.add(rimMesh);

  // 흙은 림 구멍보다 조금 크게 만들어 옆면이 림에 가려지게 한다
  const soilW = W - RIM_T * 2 + 0.1;
  const soilD = D - RIM_T * 2 + 0.1;
  const soil = new THREE.Mesh(
    bakeSoilShade(
      extrudeUp(roundedRect(soilW, soilD, 0.2), 0.3, 0.03),
      soilW / 2,
      soilD / 2
    ),
    soilMaterial
  );
  soil.position.y = SOIL_TOP - 0.3;
  soil.receiveShadow = true;
  planter.add(soil);

  /* ----------------------------- 식물 ----------------------------- */

  const plants = new THREE.Group();
  plants.name = "plants";
  plants.position.y = SOIL_TOP - 0.06; // 흙에 살짝 박혀 보이게

  /*
    "자라나는" 연출을 위해 포기마다 홀더에 담는다.
    홀더의 scale 만 건드리면 되고, 안쪽 모델은 그대로 둔다.
  */
  const plantParts: THREE.Group[] = [];
  const plantSpots: { x: number; z: number; radius: number }[] = [];

  const addPlant = (
    object: THREE.Object3D,
    x: number,
    z: number,
    spin: number,
    radius: number
  ) => {
    const holder = new THREE.Group();
    holder.position.set(x, 0, z);
    holder.rotation.y = spin;
    holder.add(object);
    plants.add(holder);
    plantParts.push(holder);
    plantSpots.push({ x, z, radius });
  };

  addPlant(makeLettuce(lettuceMaterial, 91_733, 1.12), -1.82, 0.02, 0.32, 0.42);
  addPlant(makeLettuce(lettuceMaterial, 40_219, 1.05), -0.42, -0.04, -0.61, 0.4);

  const sprout = makeSprout(sproutMaterial, sproutMaterial);
  sprout.scale.setScalar(1.12);
  addPlant(sprout, 0.78, 0, 0.5, 0.26);

  addPlant(makeChives(chiveMaterial), 1.92, 0, 0, 0.32);

  /* ------------------------- 계측 레이어 (도면) ------------------------- */
  /*
    "심어봄이 계산한다"를 눈에 보이게 만드는 층이다.
    바닥 그리드 + 치수선이 먼저 깔리고, 심을 자리에 표식이 찍히고,
    그 자리에서 식물이 자라 오르면 도면이 걷힌다.
    전부 선과 링이라 폴리곤 부담이 거의 없다.
  */

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x8fe3c2,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const blueprint = new THREE.Group();
  blueprint.name = "blueprint";

  /*
    바닥 그리드.
    THREE.GridHelper 는 선 하나가 끝에서 끝까지라 가장자리를 흐리게 만들 수 없다.
    화면을 가득 채운 모눈종이처럼 보이면 촌스러우므로,
    선을 잘게 쪼개 정점 색으로 바깥을 죽인 그리드를 직접 만든다.
    한 칸 = 1 유닛 = 10cm 라 그 자체로 눈금 역할을 한다.
  */
  const gridPositions: number[] = [];
  const gridColors: number[] = [];
  const gridTint = new THREE.Color(0x6fd3aa);
  const gridHalf = 5.5;

  const pushGridLine = (
    x1: number, z1: number,
    x2: number, z2: number
  ) => {
    const segments = 14;
    for (let i = 0; i < segments; i += 1) {
      for (const t of [i / segments, (i + 1) / segments]) {
        const x = x1 + (x2 - x1) * t;
        const z = z1 + (z2 - z1) * t;
        gridPositions.push(x, 0, z);
        // 화분이 가로로 기니 감쇠도 가로로 넓은 타원으로 잡는다
        const r = Math.min(
          1,
          Math.hypot(x / (gridHalf * 1.15), z / (gridHalf * 0.62))
        );
        const fade = Math.pow(1 - r, 1.7);
        gridColors.push(gridTint.r * fade, gridTint.g * fade, gridTint.b * fade);
      }
    }
  };

  for (let v = -gridHalf; v <= gridHalf + 0.001; v += 1) {
    pushGridLine(-gridHalf, v, gridHalf, v);
    pushGridLine(v, -gridHalf, v, gridHalf);
  }

  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(gridPositions, 3)
  );
  gridGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(gridColors, 3)
  );

  const gridMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  grid.position.y = 0.004;
  blueprint.add(grid);

  // 치수선 — 가로 / 세로 / 깊이
  const gap = 0.55;
  const tick = 0.22;
  const points: number[] = [];

  const segment = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number
  ) => points.push(ax, ay, az, bx, by, bz);

  // 가로 (앞쪽 바닥)
  const zFront = D / 2 + gap;
  segment(-W / 2, 0.01, zFront, W / 2, 0.01, zFront);
  segment(-W / 2, 0.01, zFront - tick, -W / 2, 0.01, zFront + tick);
  segment(W / 2, 0.01, zFront - tick, W / 2, 0.01, zFront + tick);

  // 세로 (오른쪽 바닥)
  const xRight = W / 2 + gap;
  segment(xRight, 0.01, -D / 2, xRight, 0.01, D / 2);
  segment(xRight - tick, 0.01, -D / 2, xRight + tick, 0.01, -D / 2);
  segment(xRight - tick, 0.01, D / 2, xRight + tick, 0.01, D / 2);

  // 깊이 (왼쪽 세로)
  const xLeft = -(W / 2 + gap);
  segment(xLeft, 0, zFront - gap, xLeft, H, zFront - gap);
  segment(xLeft - tick, 0, zFront - gap, xLeft + tick, 0, zFront - gap);
  segment(xLeft - tick, H, zFront - gap, xLeft + tick, H, zFront - gap);

  // 화분 외곽을 따라가는 보조선
  segment(-W / 2, 0.01, zFront, -W / 2, 0.01, D / 2);
  segment(W / 2, 0.01, zFront, W / 2, 0.01, D / 2);

  const dimGeometry = new THREE.BufferGeometry();
  dimGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3)
  );
  blueprint.add(new THREE.LineSegments(dimGeometry, lineMaterial));

  // 심을 자리 표식
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0x8fe3c2,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  const markers: THREE.Mesh[] = [];
  for (const spot of plantSpots) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(spot.radius * 0.82, spot.radius, 28),
      markerMaterial
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(spot.x, SOIL_TOP + 0.012, spot.z);
    ring.scale.setScalar(0.001);
    // 정지 컷(planter-3d)은 이 연출을 쓰지 않으므로 기본은 꺼 둔다
    ring.visible = false;
    blueprint.add(ring);
    markers.push(ring);
  }

  /* --------------------------- 바닥 그림자 --------------------------- */

  const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    groundMaterial
  );
  ground.name = "ground";
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.002;
  ground.receiveShadow = true;

  /* ----------------------------- 구도 ----------------------------- */

  // 회전은 화분과 식물이 함께 움직여야 하므로 한 그룹으로 묶는다
  const root = new THREE.Group();
  root.name = "root";
  root.add(planter);
  root.add(plants);

  // 구도는 화분과 식물로만 잡는다. 도면 층은 화면 밖으로 나가도 상관없다.
  const bounds = new THREE.Box3()
    .setFromObject(planter)
    .union(new THREE.Box3().setFromObject(plants));

  root.add(blueprint);

  const target = bounds.getCenter(new THREE.Vector3());
  target.y += 0.06;

  scene.add(root);
  scene.add(ground);

  return {
    scene,
    bounds,
    target,
    root,
    lights: { key, hemi, rim },
    materials,
    effects: {
      plants: plantParts,
      markers,
      markerMaterial,
      lineMaterial,
      gridMaterial,
    },
    dispose: () => {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      materials.forEach((material) => material.dispose());
      groundMaterial.dispose();
      lineMaterial.dispose();
      markerMaterial.dispose();
      gridGeometry.dispose();
      dimGeometry.dispose();
    },
  };
}
