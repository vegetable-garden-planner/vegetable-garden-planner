"use client";

import { ContactShadows, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  memo,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import {
  CROP_OPTIONS,
  getPlantingSlots,
  type CropId,
} from "@/features/start-diagnosis/data/crop-selection";
import styles from "./crop-selection-stage.module.css";

type Vec3 = readonly [number, number, number];

type CropAsset = {
  phase: number;
  scale: number;
  timeScale: number;
  url: string;
};

const PLANTER_URL = "/models/garden/planter.glb";
const BASE_PLANTER = { width: 0.6, depth: 0.2, height: 0.25 } as const;
const BASE_SOIL_HEIGHT = 0.229;

const CROP_ASSETS: Record<CropId, CropAsset> = {
  lettuce: {
    phase: 0.34,
    scale: 1,
    timeScale: 0.94,
    url: "/models/garden/crop-lettuce.glb",
  },
  "cherry-tomato": {
    phase: 1.16,
    scale: 0.94,
    timeScale: 1.08,
    url: "/models/garden/crop-cherry-tomato.glb",
  },
  basil: {
    phase: 2.08,
    scale: 1,
    timeScale: 0.88,
    url: "/models/garden/crop-basil.glb",
  },
  chili: {
    phase: 3.02,
    scale: 0.94,
    timeScale: 1.12,
    url: "/models/garden/crop-chili.glb",
  },
  spinach: {
    phase: 4.22,
    scale: 1,
    timeScale: 0.97,
    url: "/models/garden/crop-spinach.glb",
  },
  strawberry: {
    phase: 5.12,
    scale: 1,
    timeScale: 1.03,
    url: "/models/garden/crop-strawberry.glb",
  },
};

export const CropGardenViewport = memo(function CropGardenViewport({
  selectedCrops,
}: {
  selectedCrops: readonly CropId[];
}) {
  const plantingSlots = useMemo(
    () => getWorldPlantingSlots(selectedCrops.length),
    [selectedCrops.length],
  );
  const cropScale = selectedCrops.length <= 2
    ? 1.08
    : selectedCrops.length === 3
      ? 0.98
      : selectedCrops.length === 4
        ? 0.88
        : 0.78;

  return (
    <div
      aria-label={`고정된 Blender 3D 화분에 ${selectedCrops.length}종의 선택 작물이 심겨 있습니다.`}
      className={styles.viewport}
      data-camera="fixed-perspective"
      data-camera-controls="none"
      data-crop-models={CROP_OPTIONS.map((crop) => crop.id).join(",")}
      data-model-source="blender-glb"
      data-planter-depth-cm="20"
      data-planter-height-cm="25"
      data-planter-width-cm="60"
      data-renderer="webgl"
      data-selected-crops={selectedCrops.join(",")}
      role="img"
    >
      <Canvas
        aria-hidden="true"
        dpr={[1, 1.55]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.9;
        }}
        shadows="percentage"
      >
        <PerspectiveCamera makeDefault far={12} fov={31} near={0.01} />
        <FixedCamera />

        <hemisphereLight color="#b7d4bd" groundColor="#06130d" intensity={0.72} />
        <directionalLight
          castShadow
          color="#ffd08b"
          intensity={2.2}
          position={[0.25, 1.45, 0.48]}
          shadow-bias={-0.00008}
          shadow-mapSize-height={1536}
          shadow-mapSize-width={1536}
        />
        <spotLight
          angle={0.72}
          castShadow
          color="#f0a85f"
          decay={1.7}
          intensity={9.5}
          penumbra={0.9}
          position={[0.05, 1.2, 0.1]}
        />
        <directionalLight color="#4f9671" intensity={0.85} position={[-0.75, 0.5, 0.5]} />
        <pointLight color="#75b66a" intensity={1.2} position={[0.48, 0.52, -0.45]} />

        <Suspense fallback={null}>
          <group name="COL_GardenStep3_Web">
            <PlanterModel />
            {CROP_OPTIONS.map((crop) => {
              const selectedIndex = selectedCrops.indexOf(crop.id);
              const active = selectedIndex >= 0;
              return (
                <CropModel
                  active={active}
                  cropId={crop.id}
                  key={crop.id}
                  position={active ? plantingSlots[selectedIndex] : [0, BASE_SOIL_HEIGHT, 0]}
                  scale={CROP_ASSETS[crop.id].scale * cropScale}
                />
              );
            })}
          </group>
        </Suspense>

        <mesh position={[0, -0.002, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.6, 1.8]} />
          <shadowMaterial opacity={0.18} transparent />
        </mesh>
        <ContactShadows
          blur={2.8}
          color="#020b07"
          far={1.2}
          opacity={0.6}
          position={[0, 0.001, 0]}
          resolution={512}
          scale={[1.6, 0.8]}
        />
      </Canvas>
    </div>
  );
});

function FixedCamera() {
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    camera.position.set(0.82, 0.52, 1.08);
    camera.lookAt(0, 0.19, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function PlanterModel() {
  const { scene } = useGLTF(PLANTER_URL);
  const planter = useMemo(() => {
    const clone = scene.clone(true);
    clone.name = "FixedPlanter_BlenderGLB";
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const prepared = sourceMaterials.map((source) => {
        const material = source.clone();
        if (material instanceof THREE.MeshStandardMaterial) {
          material.metalness = 0;
          material.envMapIntensity = 0.82;
        }
        return material;
      });
      object.material = Array.isArray(object.material) ? prepared : prepared[0];
    });
    return clone;
  }, [scene]);

  useEffect(() => () => {
    planter.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }, [planter]);

  return <primitive object={planter} />;
}

function CropModel({
  active,
  cropId,
  position,
  scale,
}: {
  active: boolean;
  cropId: CropId;
  position: Vec3;
  scale: number;
}) {
  const asset = CROP_ASSETS[cropId];
  const { animations, scene } = useGLTF(asset.url);
  const group = useRef<THREE.Group>(null);
  const progress = useRef(active ? 1 : 0);
  const lastPosition = useRef(new THREE.Vector3(...position));
  const targetScale = useRef(scale);
  const materials = useRef<THREE.Material[]>([]);
  const model = useMemo(() => cloneSkeleton(scene) as THREE.Group, [scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);

  useLayoutEffect(() => {
    const prepared = new Set<THREE.Material>();
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = true;
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const clonedMaterials = sourceMaterials.map((source) => {
        const material = source.clone();
        material.transparent = true;
        material.opacity = progress.current;
        if (material instanceof THREE.MeshStandardMaterial) {
          material.metalness = 0;
          material.envMapIntensity = 0.78;
          material.side = THREE.FrontSide;
        }
        prepared.add(material);
        return material;
      });
      object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0];
    });
    materials.current = [...prepared];
  }, [model]);

  useEffect(() => {
    const clip = animations.find((animation) => animation.name === "AN_IdleSway") ?? animations[0];
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.timeScale = asset.timeScale;
    action.play();
    action.time = (asset.phase / Math.PI / 2) * clip.duration;
    return () => {
      action.stop();
      mixer.uncacheAction(clip, model);
    };
  }, [animations, asset.phase, asset.timeScale, mixer, model]);

  useEffect(() => {
    if (active) lastPosition.current.set(...position);
    targetScale.current = scale;
  }, [active, position, scale]);

  useEffect(() => () => {
    materials.current.forEach((material) => material.dispose());
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
  }, [mixer, model]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const target = active ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, target, 7.2, delta);
    const eased = 1 - Math.pow(1 - progress.current, 3);
    const targetPosition = lastPosition.current;
    const visible = active || progress.current > 0.008;

    group.current.visible = visible;
    if (visible) mixer.update(delta);
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, targetPosition.x, 7.2, delta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetPosition.y - (1 - eased) * 0.022, 7.2, delta);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, targetPosition.z, 7.2, delta);
    const animatedScale = targetScale.current * (0.75 + eased * 0.25);
    group.current.scale.setScalar(animatedScale);
    materials.current.forEach((material) => {
      material.opacity = progress.current;
      material.depthWrite = progress.current > 0.28;
    });
  });

  return (
    <group name={`CropPatch_${cropId}`} position={position} ref={group} scale={scale} visible={active}>
      <primitive object={model} />
    </group>
  );
}

function getWorldPlantingSlots(
  count: number,
): readonly Vec3[] {
  const innerWidth = BASE_PLANTER.width - 0.08;
  const innerDepth = BASE_PLANTER.depth - 0.06;
  return getPlantingSlots(count).map(([normalizedX, normalizedZ]) => [
    normalizedX * innerWidth,
    BASE_SOIL_HEIGHT,
    normalizedZ * innerDepth,
  ] as const);
}

useGLTF.preload(PLANTER_URL);
Object.values(CROP_ASSETS).forEach((asset) => useGLTF.preload(asset.url));
