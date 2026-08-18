"use client";

import { ContactShadows, Environment, Lightformer, Line, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import styles from "./diagnosis-form.module.css";

type PlanterMeasurements = {
  width: number;
  length: number;
  height: number;
  count: number;
};

type ProductDimensions = {
  width: number;
  depth: number;
  height: number;
};

type PreparedModule = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  name: string;
};

type SourceModule = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrixWorld: THREE.Matrix4;
  name: string;
};

type PreparedPlanterAssets = {
  frontRibGeometry: THREE.BufferGeometry;
  frontRibMaterial: THREE.Material;
  modules: PreparedModule[];
  sideRibGeometry: THREE.BufferGeometry;
  sideRibMaterial: THREE.Material;
};

const MODEL_URL = "/models/planter-modular.glb?v=blender-self-contained-2";
const BASE_WIDTH = 0.6;
const BASE_HEIGHT = 0.25;
const BASE_DEPTH = 0.2;
const BASE_BODY_BOTTOM = 0.045;
const BASE_RIM_BOTTOM = 0.225;
const RIM_HEIGHT = 0.025;
const FIXED_CORNER_SIZE = 0.03;
const RIB_SPACING = 0.018;
const RIB_BASE_HEIGHT = 0.148;
const RIB_BOTTOM = 0.07;
const ACCENT_COLOR = "#f1cf83";
const PLANTER_GAP = 0.055;
const VIEW_RIGHT_X = 0.862;
const VIEW_RIGHT_Z = -0.507;
const VIEW_FORWARD_X = 0.507;
const VIEW_FORWARD_Z = 0.862;

export function PlanterViewport({ measurements }: { measurements: PlanterMeasurements }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
  const [bounds, setBounds] = useState<ProductDimensions>({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    depth: BASE_DEPTH,
  });
  const visibleCount = Math.max(1, Math.min(measurements.count, 3));
  const targetDimensions = useMemo<ProductDimensions>(
    () => ({
      width: measurements.width / 100,
      height: measurements.height / 100,
      depth: measurements.length / 100,
    }),
    [measurements.height, measurements.length, measurements.width],
  );
  const dimensions = useAnimatedDimensions(targetDimensions, reducedMotion);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const updateBounds = useCallback((next: ProductDimensions) => {
    setBounds((current) => {
      const unchanged =
        Math.abs(current.width - next.width) < 0.00005 &&
        Math.abs(current.height - next.height) < 0.00005 &&
        Math.abs(current.depth - next.depth) < 0.00005;
      return unchanged ? current : next;
    });
  }, []);
  const handleModelReady = useCallback(() => setModelStatus("ready"), []);
  const handleModelError = useCallback(() => setModelStatus("error"), []);

  return (
    <div
      aria-label="입력한 가로, 세로, 깊이와 개수에 맞춰 크기만 변경되는 고정형 Blender 3D 화분 미리보기"
      className={styles.planterViewport}
      data-bbox-depth-cm={(bounds.depth * 100).toFixed(2)}
      data-bbox-height-cm={(bounds.height * 100).toFixed(2)}
      data-bbox-width-cm={(bounds.width * 100).toFixed(2)}
      data-depth={(dimensions.depth * 100).toFixed(2)}
      data-height={(dimensions.height * 100).toFixed(2)}
      data-model-source="blender-glb"
      data-planter-count={visibleCount}
      data-width={(dimensions.width * 100).toFixed(2)}
      role="img"
    >
      <Canvas
        camera={{ far: 20, fov: 33, near: 0.01, position: [0.78, 0.5, 1.18] }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.98;
        }}
        shadows="percentage"
      >
        <CameraRig count={visibleCount} />
        <hemisphereLight color="#c6e2d2" groundColor="#071f17" intensity={0.68} />
        <directionalLight
          castShadow
          color="#b8d8c7"
          intensity={3.15}
          position={[-1.4, 2.6, 1.3]}
          shadow-bias={-0.00008}
          shadow-mapSize-height={2048}
          shadow-mapSize-width={2048}
        />
        <directionalLight color="#7a9b8b" intensity={1.05} position={[1.7, 0.85, 1.25]} />
        <spotLight angle={0.46} color="#73d6a2" intensity={9.2} penumbra={0.9} position={[0.4, 2.1, -1.8]} />

        <PlanterSceneErrorBoundary onError={handleModelError}>
          <Suspense fallback={null}>
            <ProductArrangement
              count={visibleCount}
              dimensions={dimensions}
              onBounds={updateBounds}
              onReady={handleModelReady}
            />
          </Suspense>
        </PlanterSceneErrorBoundary>

        <mesh position={[0, -0.003, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5, 4]} />
          <shadowMaterial opacity={0.12} transparent />
        </mesh>
        <ContactShadows blur={3.2} far={1.5} opacity={0.56} position={[0, 0, 0]} resolution={512} scale={4.2} />
        <Environment resolution={128}>
          <Lightformer
            color="#b8d8c7"
            form="rect"
            intensity={1.7}
            position={[-1.5, 2.5, 2]}
            rotation-x={-Math.PI / 3}
            scale={[3.2, 1.2, 1]}
          />
          <Lightformer color="#7a9b8b" form="rect" intensity={1.05} position={[2.5, 0.7, 0]} rotation-y={-Math.PI / 2} scale={[2, 2, 1]} />
          <Lightformer color="#0b1b16" form="ring" intensity={0.45} position={[0, 1.5, -2.5]} scale={[2.5, 2.5, 1]} />
        </Environment>
      </Canvas>
      {modelStatus !== "ready" && (
        <span className={styles.planterStatus} data-status={modelStatus} role="status">
          {modelStatus === "error" ? "3D 화분을 불러오지 못했습니다. 페이지를 새로고침해 주세요." : "3D 화분을 불러오는 중입니다."}
        </span>
      )}
      <span className={styles.srOnly}>
        가로 {measurements.width}센티미터, 세로 {measurements.length}센티미터, 깊이 {measurements.height}센티미터 화분 {visibleCount}개가 고정된 구도로 표시됩니다.
      </span>
    </div>
  );
}

function ProductArrangement({
  count,
  dimensions,
  onBounds,
  onReady,
}: {
  count: number;
  dimensions: ProductDimensions;
  onBounds: (bounds: ProductDimensions) => void;
  onReady: () => void;
}) {
  const assets = usePlanterAssets(dimensions);
  useEffect(() => onReady(), [onReady]);
  const positions = useMemo<[number, number, number][]>(() => {
    if (count === 1) return [[0, 0, 0]];
    if (count === 2) {
      return [
        [0, 0, 0],
        composeScenePosition(dimensions.width * 0.24, -0.75),
      ];
    }
    const backOffset = Math.min(0.4, (dimensions.width + PLANTER_GAP) / (2 * VIEW_RIGHT_X));
    return [
      [0, 0, 0],
      composeScenePosition(-backOffset, -0.72),
      composeScenePosition(backOffset, -0.72),
    ];
  }, [count, dimensions.width]);
  const arrangementRef = useRef<THREE.Group>(null);
  const { camera, size } = useThree((state) => ({ camera: state.camera, size: state.size }));

  useLayoutEffect(() => {
    const arrangement = arrangementRef.current;
    const representative = arrangement?.getObjectByName("representative-planter");
    if (!arrangement || !representative) return;

    arrangement.position.set(0, 0, 0);
    arrangement.updateMatrixWorld(true);
    const centerAtOrigin = getProjectedCenterX(representative, camera);
    const calibrationStep = 0.01;
    const calibration = composeScenePosition(calibrationStep, 0);
    arrangement.position.set(...calibration);
    arrangement.updateMatrixWorld(true);
    const centerAtCalibration = getProjectedCenterX(representative, camera);
    const pixelsPerSceneUnit = (centerAtCalibration - centerAtOrigin) / calibrationStep;
    const opticalOffset = Math.abs(pixelsPerSceneUnit) < 0.0001 ? 0 : -centerAtOrigin / pixelsPerSceneUnit;
    arrangement.position.set(...composeScenePosition(opticalOffset, 0));
    arrangement.updateMatrixWorld(true);
  }, [assets, camera, count, dimensions, positions, size.height, size.width]);

  return (
    <group ref={arrangementRef}>
      {positions.map((position, index) => (
        <PlanterInstance
          assets={assets}
          dimensions={dimensions}
          key={`planter-${index}`}
          measured={index === 0}
          onBounds={onBounds}
          position={position}
        />
      ))}
      <group position={positions[0]}>
        <DimensionGuides dimensions={dimensions} />
      </group>
    </group>
  );
}

function composeScenePosition(screenOffset: number, depthOffset: number): [number, number, number] {
  return [
    screenOffset * VIEW_RIGHT_X + depthOffset * VIEW_FORWARD_X,
    0,
    screenOffset * VIEW_RIGHT_Z + depthOffset * VIEW_FORWARD_Z,
  ];
}

function getProjectedCenterX(object: THREE.Object3D, camera: THREE.Camera) {
  const box = new THREE.Box3().setFromObject(object, true);
  const corner = new THREE.Vector3();
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;

  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        corner.set(x, y, z).project(camera);
        minX = Math.min(minX, corner.x);
        maxX = Math.max(maxX, corner.x);
      }
    }
  }

  return (minX + maxX) * 0.5;
}

class PlanterSceneErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Blender planter scene failed to render", error, errorInfo);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function PlanterInstance({
  assets,
  dimensions,
  measured,
  onBounds,
  position,
}: {
  assets: PreparedPlanterAssets;
  dimensions: ProductDimensions;
  measured: boolean;
  onBounds: (bounds: ProductDimensions) => void;
  position: [number, number, number];
}) {
  useLayoutEffect(() => {
    if (!measured) return;
    const box = new THREE.Box3();
    for (const planterModule of assets.modules) {
      planterModule.geometry.computeBoundingBox();
      if (planterModule.geometry.boundingBox) box.union(planterModule.geometry.boundingBox);
    }
    const size = box.getSize(new THREE.Vector3());
    onBounds({ width: size.x, height: size.y, depth: size.z });
  }, [assets, measured, onBounds]);

  return (
    <group name={measured ? "representative-planter" : undefined} position={position}>
      {assets.modules.map((planterModule) => (
        <mesh
          castShadow
          geometry={planterModule.geometry}
          key={planterModule.name}
          material={planterModule.material}
          name={planterModule.name}
          receiveShadow
        />
      ))}
      <PlanterRibs assets={assets} dimensions={dimensions} />
    </group>
  );
}

function PlanterRibs({ assets, dimensions }: { assets: PreparedPlanterAssets; dimensions: ProductDimensions }) {
  const frontSpan = Math.max(RIB_SPACING * 2, dimensions.width - 0.132);
  const sideSpan = Math.max(RIB_SPACING * 2, dimensions.depth - 0.128);
  const frontCount = Math.max(3, Math.floor(frontSpan / RIB_SPACING) + 1);
  const sideCount = Math.max(3, Math.floor(sideSpan / RIB_SPACING) + 1);
  const ribHeight = Math.max(0.03, dimensions.height - 0.102);
  const ribCenterY = RIB_BOTTOM + ribHeight * 0.5;
  const ribHeightScale = ribHeight / RIB_BASE_HEIGHT;

  return (
    <>
      <RibInstances
        axis="x"
        center={[0, ribCenterY, dimensions.depth * 0.5 - 0.01]}
        count={frontCount}
        geometry={assets.frontRibGeometry}
        heightScale={ribHeightScale}
        material={assets.frontRibMaterial}
        span={frontSpan}
      />
      <RibInstances
        axis="x"
        center={[0, ribCenterY, -dimensions.depth * 0.5 + 0.01]}
        count={frontCount}
        geometry={assets.frontRibGeometry}
        heightScale={ribHeightScale}
        material={assets.frontRibMaterial}
        span={frontSpan}
      />
      <RibInstances
        axis="z"
        center={[-dimensions.width * 0.5 + 0.01, ribCenterY, 0]}
        count={sideCount}
        geometry={assets.sideRibGeometry}
        heightScale={ribHeightScale}
        material={assets.sideRibMaterial}
        span={sideSpan}
      />
      <RibInstances
        axis="z"
        center={[dimensions.width * 0.5 - 0.01, ribCenterY, 0]}
        count={sideCount}
        geometry={assets.sideRibGeometry}
        heightScale={ribHeightScale}
        material={assets.sideRibMaterial}
        span={sideSpan}
      />
    </>
  );
}

function RibInstances({
  axis,
  center,
  count,
  geometry,
  heightScale,
  material,
  span,
}: {
  axis: "x" | "z";
  center: [number, number, number];
  count: number;
  geometry: THREE.BufferGeometry;
  heightScale: number;
  material: THREE.Material;
  span: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const instance = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    if (!ref.current) return;
    for (let index = 0; index < count; index += 1) {
      const offset = count === 1 ? 0 : THREE.MathUtils.lerp(-span * 0.5, span * 0.5, index / (count - 1));
      instance.position.set(
        center[0] + (axis === "x" ? offset : 0),
        center[1],
        center[2] + (axis === "z" ? offset : 0),
      );
      instance.scale.set(1, heightScale, 1);
      instance.updateMatrix();
      ref.current.setMatrixAt(index, instance.matrix);
    }
    ref.current.count = count;
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingBox();
    ref.current.computeBoundingSphere();
  }, [axis, center, count, heightScale, instance, span]);

  return (
    <instancedMesh
      args={[geometry, material, count]}
      castShadow
      count={count}
      frustumCulled={false}
      ref={ref}
      receiveShadow
    />
  );
}

function DimensionGuides({ dimensions }: { dimensions: ProductDimensions }) {
  const { width, height, depth } = dimensions;
  const horizontalOffset = 0.048;
  const topOffset = 0.055;
  return (
    <group>
      <DimensionLine end={[width * 0.5, height + topOffset, depth * 0.5]} start={[-width * 0.5, height + topOffset, depth * 0.5]} />
      <DimensionLine
        end={[-width * 0.5 - horizontalOffset, height, depth * 0.5]}
        start={[-width * 0.5 - horizontalOffset, 0.004, depth * 0.5]}
      />
      <DimensionLine
        end={[-width * 0.5 - horizontalOffset, height + 0.027, -depth * 0.5]}
        start={[-width * 0.5 - horizontalOffset, height + 0.027, depth * 0.5]}
      />
    </group>
  );
}

function DimensionLine({ end, start }: { end: [number, number, number]; start: [number, number, number] }) {
  const direction = useMemo(() => new THREE.Vector3(...end).sub(new THREE.Vector3(...start)).normalize(), [end, start]);
  const reverse = useMemo(() => direction.clone().multiplyScalar(-1), [direction]);
  return (
    <group>
      <Line color={ACCENT_COLOR} dashScale={1} dashSize={0.018} dashed gapSize={0.012} lineWidth={1.25} points={[start, end]} />
      <ArrowHead direction={direction} position={end} />
      <ArrowHead direction={reverse} position={start} />
    </group>
  );
}

function ArrowHead({ direction, position }: { direction: THREE.Vector3; position: [number, number, number] }) {
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
    [direction],
  );
  return (
    <mesh position={position} quaternion={quaternion}>
      <coneGeometry args={[0.012, 0.028, 12]} />
      <meshStandardMaterial color={ACCENT_COLOR} emissive={ACCENT_COLOR} emissiveIntensity={0.14} roughness={0.5} />
    </mesh>
  );
}

function CameraRig({ count }: { count: number }) {
  const { camera, size } = useThree((state) => ({ camera: state.camera, size: state.size }));

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const narrowFit = aspect < 1.02 ? 1.02 / aspect : 1;
    const countDistance = count === 1 ? 1.55 : count === 2 ? 1.75 : 1.8;
    const distance = countDistance * narrowFit;
    camera.position.set(distance * 0.59, 0.54 * narrowFit, distance);
    camera.lookAt(0, 0.2, 0);
    camera.updateProjectionMatrix();
  }, [camera, count, size.height, size.width]);
  return null;
}

function usePlanterAssets(dimensions: ProductDimensions): PreparedPlanterAssets {
  const { scene } = useGLTF(MODEL_URL);
  const sources = useMemo(() => collectSources(scene), [scene]);
  const materials = useMemo(() => prepareMaterials(sources.modules), [sources.modules]);
  const modules = useMemo(
    () =>
      sources.modules.map((source) => ({
        geometry: createNineSliceGeometry(source, dimensions),
        material: materials.get(source.material.uuid) ?? source.material,
        name: source.name,
      })),
    [dimensions, materials, sources.modules],
  );
  const frontRibGeometry = useMemo(() => createCenteredGeometry(sources.frontRib), [sources.frontRib]);
  const sideRibGeometry = useMemo(() => createCenteredGeometry(sources.sideRib), [sources.sideRib]);
  const frontRibMaterial = materials.get(sources.frontRib.material.uuid) ?? sources.frontRib.material;
  const sideRibMaterial = materials.get(sources.sideRib.material.uuid) ?? sources.sideRib.material;

  useEffect(() => () => modules.forEach((planterModule) => planterModule.geometry.dispose()), [modules]);
  useEffect(
    () => () => {
      frontRibGeometry.dispose();
      sideRibGeometry.dispose();
    },
    [frontRibGeometry, sideRibGeometry],
  );
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  return { modules, frontRibGeometry, sideRibGeometry, frontRibMaterial, sideRibMaterial };
}

function collectSources(scene: THREE.Group) {
  scene.updateMatrixWorld(true);
  const modules: SourceModule[] = [];
  let frontRib: SourceModule | undefined;
  let sideRib: SourceModule | undefined;

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !(object.geometry instanceof THREE.BufferGeometry)) return;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const source = {
      geometry: object.geometry,
      material,
      matrixWorld: object.matrixWorld.clone(),
      name: object.name,
    };
    if (object.name === "SM_Rib_Front_01") frontRib = source;
    if (object.name === "SM_Rib_Left_01") sideRib = source;
    if (!object.name.startsWith("SM_Rib_")) modules.push(source);
  });

  if (!frontRib || !sideRib) {
    throw new Error("Blender GLB에서 기준 리브 메시를 찾지 못했습니다.");
  }
  return { frontRib, modules, sideRib };
}

function prepareMaterials(modules: SourceModule[]) {
  const prepared = new Map<string, THREE.Material>();
  for (const planterModule of modules) {
    if (prepared.has(planterModule.material.uuid)) continue;
    const material = planterModule.material.clone();
    if (material instanceof THREE.MeshStandardMaterial) {
      const isCavity = material.name.toLowerCase().includes("cavity");
      material.metalness = 0;
      material.color.lerp(new THREE.Color(isCavity ? "#0b2017" : "#315b49"), isCavity ? 0.08 : 0.18);
      material.roughness = isCavity ? 0.64 : 0.5;
      material.envMapIntensity = 0.96;
      material.side = THREE.FrontSide;
    }
    if (material instanceof THREE.MeshPhysicalMaterial) {
      material.clearcoat = material.name.toLowerCase().includes("cavity") ? 0.01 : 0.04;
      material.clearcoatRoughness = 0.66;
    }
    prepared.set(planterModule.material.uuid, material);
  }
  return prepared;
}

function createNineSliceGeometry(source: SourceModule, dimensions: ProductDimensions) {
  const geometry = source.geometry.clone();
  geometry.applyMatrix4(source.matrixWorld);
  const position = geometry.getAttribute("position");
  const isFoot = source.name.startsWith("SM_Feet_");
  const footBox = isFoot ? new THREE.Box3().setFromBufferAttribute(position as THREE.BufferAttribute) : null;
  const footCenter = footBox?.getCenter(new THREE.Vector3());
  const footTargetX = footCenter
    ? Math.sign(footCenter.x) * Math.max(0, dimensions.width * 0.5 - 0.099)
    : 0;
  const footTargetZ = footCenter
    ? Math.sign(footCenter.z) * Math.max(0, dimensions.depth * 0.5 - 0.0635)
    : 0;

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    position.setXYZ(
      index,
      footCenter ? x + footTargetX - footCenter.x : remapAxis(x, BASE_WIDTH * 0.5, dimensions.width * 0.5),
      remapHeight(y, dimensions.height),
      footCenter ? z + footTargetZ - footCenter.z : remapAxis(z, BASE_DEPTH * 0.5, dimensions.depth * 0.5),
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCenteredGeometry(source: SourceModule) {
  const geometry = source.geometry.clone();
  geometry.applyMatrix4(source.matrixWorld);
  geometry.computeBoundingBox();
  const center = geometry.boundingBox?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function remapAxis(value: number, baseHalfExtent: number, targetHalfExtent: number) {
  const sign = Math.sign(value);
  const absolute = Math.abs(value);
  const centerLimit = baseHalfExtent - FIXED_CORNER_SIZE;
  if (absolute >= centerLimit) {
    return sign * (targetHalfExtent - (baseHalfExtent - absolute));
  }
  const targetCenterLimit = targetHalfExtent - FIXED_CORNER_SIZE;
  return value * (targetCenterLimit / centerLimit);
}

function remapHeight(value: number, targetHeight: number) {
  if (value <= BASE_BODY_BOTTOM) return value;
  if (value >= BASE_RIM_BOTTOM) return value + targetHeight - BASE_HEIGHT;
  const targetRimBottom = targetHeight - RIM_HEIGHT;
  const progress = (value - BASE_BODY_BOTTOM) / (BASE_RIM_BOTTOM - BASE_BODY_BOTTOM);
  return THREE.MathUtils.lerp(BASE_BODY_BOTTOM, targetRimBottom, progress);
}

function useAnimatedDimensions(target: ProductDimensions, reducedMotion: boolean) {
  const [current, setCurrent] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    const start = currentRef.current;
    const startedAt = performance.now();
    const duration = reducedMotion ? 0 : 300;
    let frame = 0;
    const update = (now: number) => {
      const progress = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = {
        width: THREE.MathUtils.lerp(start.width, target.width, eased),
        height: THREE.MathUtils.lerp(start.height, target.height, eased),
        depth: THREE.MathUtils.lerp(start.depth, target.depth, eased),
      };
      currentRef.current = next;
      setCurrent(next);
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, target]);

  return current;
}

useGLTF.preload(MODEL_URL);
