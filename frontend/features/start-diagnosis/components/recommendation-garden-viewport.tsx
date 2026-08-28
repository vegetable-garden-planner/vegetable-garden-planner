"use client";

import { ContactShadows, PerspectiveCamera, useGLTF, View } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CROP_RULES } from "../data/crop-rules";
import type { CropId } from "../data/crop-selection";
import type { GardenConfiguration } from "../domain/garden-configuration";
import type {
  CropRecommendation,
  PlanterRecommendation,
} from "../domain/garden-recommendation";

type Vec3 = readonly [number, number, number];
type LodLevel = 0 | 1 | 2;

const BASE_PLANTER = { width: 0.6, height: 0.25, depth: 0.2 } as const;
const BASE_SOIL_HEIGHT = 0.229;
const BOTTOM_STRUCTURE_METERS = 0.02;
const GUIDE_SOIL_FILL_HEIGHT_METERS = 0.2;
const CROP_VERTICAL_SCALE = 1.14;
const HIDDEN_MATERIAL = new THREE.MeshBasicMaterial();
HIDDEN_MATERIAL.visible = false;
const PREPARED_MATERIALS = new WeakMap<THREE.Material, THREE.Material>();

const CROP_ASSETS: Record<CropId, {
  animationName: string;
  height: number;
  phase: number;
  scale: number;
  timeScale: number;
}> = {
  lettuce: { animationName: "AN_Lettuce_IdleSway", height: 0.105, phase: 0.34, scale: 1.35, timeScale: 0.94 },
  "cherry-tomato": { animationName: "AN_CherryTomato_IdleSway", height: 0.245, phase: 1.16, scale: 1.22, timeScale: 1.08 },
  basil: { animationName: "AN_Basil_IdleSway", height: 0.205, phase: 2.08, scale: 1.28, timeScale: 0.88 },
  chili: { animationName: "AN_Chili_IdleSway", height: 0.235, phase: 3.02, scale: 1.24, timeScale: 1.12 },
  spinach: { animationName: "AN_Spinach_IdleSway", height: 0.105, phase: 4.22, scale: 1.35, timeScale: 0.97 },
  strawberry: { animationName: "AN_Strawberry_IdleSway", height: 0.125, phase: 5.12, scale: 1.28, timeScale: 1.03 },
};

export function RecommendationPlanterView({
  className,
  configuration,
  index,
  planter,
  totalSeedlings,
}: {
  className: string;
  configuration: GardenConfiguration;
  index: number;
  planter: PlanterRecommendation;
  totalSeedlings: number;
}) {
  const lod = chooseLod(configuration.planter.count, totalSeedlings);

  return (
    <View className={className} frames={Infinity} index={index + 1}>
      <Suspense fallback={null}>
        <PlanterScene
          configuration={configuration}
          lod={lod}
          planter={planter}
          planterIndex={index}
        />
      </Suspense>
    </View>
  );
}

export function Recommendation3DCanvas({ className }: { className: string }) {
  return (
    <div aria-hidden="true" className={className} data-shared-webgl-canvas="true">
      <Canvas
        dpr={[1, 1.5]}
        frameloop="always"
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.88;
        }}
        shadows="percentage"
      >
        <View.Port />
      </Canvas>
    </div>
  );
}

function PlanterScene({
  configuration,
  lod,
  planter,
  planterIndex,
}: {
  configuration: GardenConfiguration;
  lod: LodLevel;
  planter: PlanterRecommendation;
  planterIndex: number;
}) {
  const cropInstances = useMemo(
    () => createCropInstances(configuration, planter),
    [configuration, planter],
  );

  return (
    <>
      <PerspectiveCamera makeDefault far={12} fov={18} near={0.01} />
      <FixedCamera />
      <hemisphereLight color="#bed9c5" groundColor="#030b07" intensity={1.05} />
      <directionalLight
        castShadow
        color="#f5d28c"
        intensity={3.35}
        position={[0.8, 1.4, 0.72]}
        shadow-bias={-0.00008}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      <directionalLight color="#64a47b" intensity={1.15} position={[-0.8, 0.46, 0.62]} />
      <spotLight
        angle={0.74}
        color="#f1b868"
        decay={1.8}
        intensity={10.8}
        penumbra={0.9}
        position={[0.54, 1.2, 0.2]}
      />
      <pointLight color="#7fbd82" intensity={1.15} position={[-0.45, 0.42, -0.42]} />

      <EntranceGroup delay={planterIndex * 0.08}>
        <PlanterModel
          lod={lod}
        />
        {cropInstances.map((instance) => (
          <AnimatedCrop
            cropId={instance.cropId}
            instanceIndex={instance.instanceIndex}
            key={`${instance.cropId}-${instance.instanceIndex}`}
            lod={lod}
            phaseOffset={planterIndex * 0.61 + instance.instanceIndex * 0.83}
            position={instance.position}
          />
        ))}
      </EntranceGroup>

      <mesh position={[0, -0.002, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 1.4]} />
        <shadowMaterial opacity={0.16} transparent />
      </mesh>
      <ContactShadows
        blur={2.6}
        color="#010704"
        far={1.1}
        opacity={0.52}
        position={[0, 0.001, 0]}
        resolution={384}
        scale={[1.5, 0.76]}
      />
    </>
  );
}

function FixedCamera() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    const cropHeight = Math.max(
      0,
      ...Object.values(CROP_ASSETS).map((asset) => (
        asset.height * asset.scale * CROP_VERTICAL_SCALE
      )),
    );
    const cropTop = GUIDE_SOIL_FILL_HEIGHT_METERS + BOTTOM_STRUCTURE_METERS + cropHeight;
    const contentTop = Math.max(BASE_PLANTER.height, cropTop) + 0.035;
    const framingHeight = contentTop / 2;
    const verticalFov = THREE.MathUtils.degToRad(18);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * (size.width / size.height));
    const verticalDistance = ((contentTop + 0.055) / 2) / Math.tan(verticalFov / 2);
    const horizontalDistance = ((BASE_PLANTER.width + 0.07) / 2) / Math.tan(horizontalFov / 2);
    const distance = Math.max(verticalDistance, horizontalDistance) * 0.86;
    const downwardTilt = Math.tan(THREE.MathUtils.degToRad(9)) * distance;
    camera.up.set(0, 1, 0);
    camera.position.set(0, framingHeight + downwardTilt, distance);
    camera.lookAt(0, framingHeight, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

function EntranceGroup({ children, delay }: { children: React.ReactNode; delay: number }) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(-delay);

  useFrame((_, delta) => {
    if (!group.current || elapsed.current >= 1) return;
    elapsed.current = Math.min(1, elapsed.current + delta * 1.9);
    const progress = Math.max(0, elapsed.current);
    const eased = 1 - Math.pow(1 - progress, 3);
    group.current.position.y = -0.025 * (1 - eased);
    group.current.scale.setScalar(0.96 + eased * 0.04);
  });

  return <group ref={group}>{children}</group>;
}

function PlanterModel({
  lod,
}: {
  lod: LodLevel;
}) {
  const { scene } = useGLTF(planterUrl(lod));
  const body = useMemo(() => createSelectivePlanterClone(scene, false), [scene]);
  const soil = useMemo(() => createSelectivePlanterClone(scene, true), [scene]);
  const soilHeightScale = GUIDE_SOIL_FILL_HEIGHT_METERS / BASE_SOIL_HEIGHT;

  return (
    <group name="PlanterGroup_Stationary">
      <primitive object={body} />
      <primitive
        object={soil}
        position={[0, BOTTOM_STRUCTURE_METERS, 0]}
        scale={[1, soilHeightScale, 1]}
      />
    </group>
  );
}

function AnimatedCrop({
  cropId,
  instanceIndex,
  lod,
  phaseOffset,
  position,
}: {
  cropId: CropId;
  instanceIndex: number;
  lod: LodLevel;
  phaseOffset: number;
  position: Vec3;
}) {
  const asset = CROP_ASSETS[cropId];
  const { animations, scene } = useGLTF(cropUrl(cropId, lod));
  const model = useMemo(() => {
    const clone = cloneSkeleton(scene) as THREE.Group;
    clone.name = `Crop_${cropId}_${instanceIndex}`;
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const prepared = materials.map((material) => prepareMaterial(material));
      object.material = Array.isArray(object.material) ? prepared : prepared[0];
    });
    return clone;
  }, [cropId, instanceIndex, scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);

  useEffect(() => {
    const clip = animations.find((animation) => animation.name === asset.animationName)
      ?? animations.find((animation) => animation.name.includes("IdleSway"))
      ?? animations[0];
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.timeScale = asset.timeScale * (1 + ((instanceIndex % 3) - 1) * 0.045);
    action.play();
    action.time = ((asset.phase + phaseOffset) % (Math.PI * 2)) / (Math.PI * 2) * clip.duration;
    return () => {
      action.stop();
      mixer.uncacheAction(clip, model);
    };
  }, [animations, asset, instanceIndex, mixer, model, phaseOffset]);

  useEffect(() => () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
  }, [mixer, model]);

  useFrame((_, delta) => mixer.update(delta));

  return (
    <group
      name={`Seedling_${cropId}_${instanceIndex}`}
      position={position}
      scale={[asset.scale, asset.scale * CROP_VERTICAL_SCALE, asset.scale]}
    >
      <primitive object={model} />
    </group>
  );
}

function createSelectivePlanterClone(source: THREE.Group, soilOnly: boolean) {
  const clone = source.clone(true);
  clone.name = soilOnly ? "Soil_UsableFillHeight" : "Planter_AAA_Reused";
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = !soilOnly;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const selected = materials.map((material) => {
      const isSoil = material.name.toLowerCase().includes("soil");
      return isSoil === soilOnly ? prepareMaterial(material) : HIDDEN_MATERIAL;
    });
    object.material = Array.isArray(object.material) ? selected : selected[0];
  });
  return clone;
}

function createCropInstances(
  configuration: GardenConfiguration,
  planter: PlanterRecommendation,
) {
  const innerWidth = BASE_PLANTER.width - 0.008;
  const innerDepth = BASE_PLANTER.depth - 0.008;
  const configuredInnerWidthCm = Math.max(configuration.planter.widthCm - 0.8, 1);
  const soilHeight = GUIDE_SOIL_FILL_HEIGHT_METERS + BOTTOM_STRUCTURE_METERS;
  let segmentStart = -innerWidth / 2;

  return planter.crops.flatMap((crop) => {
    const segmentWidth = innerWidth * (crop.allocatedWidthCm / configuredInnerWidthCm);
    const positions = createSeedlingGrid(crop, segmentStart, segmentWidth, innerDepth, soilHeight);
    segmentStart += segmentWidth;
    return positions.map((position, instanceIndex) => ({
      cropId: crop.cropId,
      instanceIndex,
      position,
    }));
  });
}

function prepareMaterial(source: THREE.Material) {
  const cached = PREPARED_MATERIALS.get(source);
  if (cached) return cached;
  const material = source.clone();
  if (material instanceof THREE.MeshStandardMaterial) {
    const isSoil = material.name.toLowerCase().includes("soil");
    const isPlanter = material.name.toLowerCase().includes("planter") && !isSoil;
    material.metalness = 0;
    material.roughness = isSoil ? Math.max(0.88, material.roughness) : Math.max(0.46, material.roughness);
    material.envMapIntensity = isSoil ? 0.62 : 0.9;
    material.side = THREE.FrontSide;
    if (isPlanter) material.color.lerp(new THREE.Color("#315b49"), 0.2);
    if (isSoil) {
      material.color.lerp(new THREE.Color("#9a603a"), 0.16);
      material.envMapIntensity = 0.88;
      material.emissive.set("#2b160c");
      material.emissiveIntensity = 0.34;
    }
    if (!isPlanter && !isSoil) {
      material.envMapIntensity = 1.18;
      material.emissive.copy(material.color).multiplyScalar(0.035);
      material.emissiveIntensity = 0.42;
    }
  }
  PREPARED_MATERIALS.set(source, material);
  return material;
}

function createSeedlingGrid(
  crop: CropRecommendation,
  segmentStart: number,
  segmentWidth: number,
  innerDepth: number,
  soilHeight: number,
): readonly Vec3[] {
  const count = crop.seedlingCount;
  const aspect = segmentWidth / innerDepth;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * Math.max(aspect, 0.35))));
  const rows = Math.ceil(count / columns);
  const rule = CROP_RULES[crop.cropId];
  const xMargin = Math.min(rule.spacingXCm / 200, segmentWidth * 0.26);
  const zMargin = Math.min(rule.spacingZCm / 200, innerDepth * 0.26);
  const xMin = segmentStart + xMargin;
  const xMax = segmentStart + segmentWidth - xMargin;
  const zMin = -innerDepth / 2 + zMargin;
  const zMax = innerDepth / 2 - zMargin;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = columns === 1 ? segmentStart + segmentWidth / 2 : THREE.MathUtils.lerp(xMin, xMax, column / (columns - 1));
    const z = rows === 1 ? 0 : THREE.MathUtils.lerp(zMin, zMax, row / (rows - 1));
    return [x, soilHeight, z] as const;
  });
}

function chooseLod(planterCount: number, totalSeedlings: number): LodLevel {
  if (planterCount > 6 || totalSeedlings > 36) return 2;
  if (planterCount > 2 || totalSeedlings > 14) return 1;
  return 0;
}

function planterUrl(lod: LodLevel) {
  return lod === 0 ? "/models/garden/planter.glb" : `/models/garden/planter-lod${lod}.glb`;
}

function cropUrl(cropId: CropId, lod: LodLevel) {
  return lod === 0
    ? `/models/garden/crop-${cropId}.glb`
    : `/models/garden/crop-${cropId}-lod${lod}.glb`;
}

for (const lod of [0, 1, 2] as const) {
  useGLTF.preload(planterUrl(lod));
  (Object.keys(CROP_ASSETS) as CropId[]).forEach((cropId) => {
    useGLTF.preload(cropUrl(cropId, lod));
  });
}
