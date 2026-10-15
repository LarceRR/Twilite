import { useFrame } from '@react-three/fiber/native';
import type { ReactElement, RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  type Group,
  type InstancedMesh,
  type MeshBasicMaterial,
  type Texture,
} from 'three';

import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import type { SurfaceObject } from '@/domains/spaces/domain/entities/SurfaceObject';

import { FieldSurfaceObjectArtwork } from './FieldSurfaceObjectArtwork';
import { cellCenterOnPlane } from './fieldGridCells';
import type { FieldConfig } from './fieldConfig';
import type { FieldGridConfig } from './fieldGridConfig';
import {
  FIELD_GRID_MAX_FIREFLY_LIGHTS,
  FIELD_GRID_MAX_OBJECT_PIXEL_LIGHTS,
  syncFieldGridPixelLights,
  type FieldGridPixelLight,
} from './fieldGridWaveMaterial';
import {
  candleFlickerMultiplier,
  resolveSurfaceObjectLightConfig,
  surfaceObjectFlickerSeed,
  SurfaceObjectLightVisibility,
  type SurfaceObjectLightConfig,
} from './surfaceObjectLighting';
import {
  advanceSpritePlayback,
  surfaceObjectRiseProgress,
  type SpritePlaybackCursor,
  SURFACE_OBJECT_ANIMATION_CONFIG,
  staggerAppearanceDelays,
} from './surfaceObjectAnimation';
import { useFieldConfig } from './useFieldConfig';
import { objectPlatformHeight } from './fieldTileGeneration';
import { useFieldTileStore } from './fieldTileStore';
import {
  advanceFirefly,
  buildFireflyClusters,
  createFirefly,
  FIREFLY_BUFFER_CAPACITY,
  fireflyCameraDistanceSquared,
  fireflyTargetCount,
  fireflyVisualOpacity,
  type Firefly,
  type FireflyCluster,
  type FireflyEmitter,
} from './fieldFireflies';

const billboardCameraPosition = new Vector3();
const fireflyVertexShader = /* glsl */ `
precision highp float;

attribute vec3 instanceFireflyColor;
attribute float instanceOpacity;
varying vec3 vColor;
varying float vOpacity;

void main() {
  vColor = instanceFireflyColor;
  vOpacity = instanceOpacity;
  vec4 localPosition = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    localPosition = instanceMatrix * localPosition;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * localPosition;
}
`;

const fireflyFragmentShader = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vOpacity;
uniform float uOpacityDiscardThreshold;

void main() {
  if (vOpacity <= uOpacityDiscardThreshold) discard;
  gl_FragColor = vec4(vColor, vOpacity);
}
`;

type FireflySimulation = {
  readonly flies: Firefly[];
  clusters: FireflyCluster[];
  refreshElapsedSec: number;
  spawnAccumulatorSec: number;
  nextId: number;
  initialized: boolean;
};

type RuntimeObject = {
  readonly artwork: RefObject<Group | null>;
  readonly object: SurfaceObject;
  readonly centerX: number;
  readonly centerY: number;
  readonly flickerSeed: number;
  readonly platformHeight: number;
  readonly platformSize: number;
  readonly artHeight: number;
  readonly lightConfig: SurfaceObjectLightConfig | null;
  readonly backendLightConfig: SurfaceObjectLightConfig | null;
  readonly flickerConfig: FieldConfig['lighting']['objectGlow']['flicker'];
  readonly minimumVisibleIntensity: number;
  readonly pixelLight: FieldGridPixelLight | null;
  lightDistanceSquared: number;
  artworkMaterial: MeshBasicMaterial | null;
  texture: Texture | null;
  cursor: SpritePlaybackCursor;
  elapsedMs: number;
  frame: number | null;
  billboardUpdated: boolean;
};

function compareLightDistance(left: RuntimeObject, right: RuntimeObject): number {
  return left.lightDistanceSquared - right.lightDistanceSquared;
}

/**
 * This layer contains only pixel-object artwork and light-source simulation.
 * Physical platforms are rendered by FieldGeneratedTiles so there is only one
 * geometry/material definition for every cell, occupied or empty.
 */
export function FieldSurfaceObjects({
  objects,
  config,
  headers,
}: {
  readonly objects: readonly SurfaceObject[];
  readonly config: FieldGridConfig;
  readonly headers: AuthenticatedAssetHeaders;
}): ReactElement {
  const runtime = useRef(new Map<string, RuntimeObject>());
  const appearance = useAppearingObjects(objects);
  const fieldConfig = useFieldConfig();
  const tileSettings = useFieldTileStore();
  const objectGlowConfig = fieldConfig.lighting.objectGlow;
  const fireflyConfig = fieldConfig.fireflies;
  const lastBillboardCameraXY = useRef({ x: Number.NaN, y: Number.NaN });
  const lightVisibility = useMemo(() => new SurfaceObjectLightVisibility(), []);
  const lightCandidates = useRef<RuntimeObject[]>([]);
  const activePixelLights = useRef<FieldGridPixelLight[]>([]);
  const fireflyEmitters = useRef<FireflyEmitter[]>([]);
  const activeFireflyLights = useRef<Firefly[]>([]);
  const fireflySimulation = useRef<FireflySimulation>({
    flies: [],
    clusters: [],
    refreshElapsedSec: 0,
    spawnAccumulatorSec: 0,
    nextId: 1,
    initialized: false,
  });
  const fireflyMesh = useRef<InstancedMesh>(null);
  const fireflyBillboard = useMemo(() => {
    const billboard = new Object3D();
    billboard.up.set(0, 0, 1);
    return billboard;
  }, []);
  const fireflyGeometry = useMemo(() => {
    const geometry = new PlaneGeometry(1, 1);
    const opacity = new InstancedBufferAttribute(
      new Float32Array(FIREFLY_BUFFER_CAPACITY),
      1,
    );
    opacity.setUsage(DynamicDrawUsage);
    const colors = new InstancedBufferAttribute(
      new Float32Array(FIREFLY_BUFFER_CAPACITY * 3),
      3,
    );
    colors.setUsage(DynamicDrawUsage);
    geometry.setAttribute('instanceOpacity', opacity);
    geometry.setAttribute('instanceFireflyColor', colors);
    return geometry;
  }, []);
  const fireflyOpacityAttribute = fireflyGeometry.getAttribute(
    'instanceOpacity',
  ) as InstancedBufferAttribute;
  const fireflyColorAttribute = fireflyGeometry.getAttribute(
    'instanceFireflyColor',
  ) as InstancedBufferAttribute;
  const fireflyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uOpacityDiscardThreshold: { value: fireflyConfig.opacityDiscardThreshold },
        },
        vertexShader: fireflyVertexShader,
        fragmentShader: fireflyFragmentShader,
        side: DoubleSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [fireflyConfig.opacityDiscardThreshold],
  );
  const fireflyColor = useMemo(() => new Color(), []);

  const register = useCallback((item: RuntimeObject): (() => void) => {
    runtime.current.set(item.object.id, item);
    return () => {
      if (runtime.current.get(item.object.id) === item) {
        runtime.current.delete(item.object.id);
      }
    };
  }, []);

  useFrame(({ camera, clock }, delta) => {
    lightVisibility.updateCamera(camera);
    camera.getWorldPosition(billboardCameraPosition);
    const cameraMoved =
      billboardCameraPosition.x !== lastBillboardCameraXY.current.x ||
      billboardCameraPosition.y !== lastBillboardCameraXY.current.y;
    if (cameraMoved) {
      lastBillboardCameraXY.current.x = billboardCameraPosition.x;
      lastBillboardCameraXY.current.y = billboardCameraPosition.y;
    }

    const candidates = lightCandidates.current;
    candidates.length = 0;
    const pixelLights = activePixelLights.current;
    pixelLights.length = 0;
    const emitters = fireflyEmitters.current;
    emitters.length = 0;

    for (const item of runtime.current.values()) {
      const deltaMs = delta * 1000;
      item.elapsedMs = Math.min(
        SURFACE_OBJECT_ANIMATION_CONFIG.riseDurationMs,
        item.elapsedMs + deltaMs,
      );
      advanceArtwork(item, deltaMs, billboardCameraPosition, cameraMoved);

      const progress = surfaceObjectRiseProgress(item.elapsedMs);
      if (item.artworkMaterial !== null && item.artworkMaterial.opacity !== progress) {
        item.artworkMaterial.opacity = progress;
      }

      const lightConfig = item.lightConfig;
      const pixelLight = item.pixelLight;
      if (lightConfig === null || pixelLight === null) continue;

      const flicker = candleFlickerMultiplier(
        clock.elapsedTime * 1000,
        item.flickerSeed,
        item.flickerConfig,
      );
      const intensity = lightConfig.intensity * flicker * progress;
      if (intensity <= item.minimumVisibleIntensity) continue;

      const topZ = item.platformHeight * progress;
      // Use the resolved light, not only the raw backend field: the resolved
      // config also includes forceAllObjectsForTesting for development scenes.
      const fireflySource = lightConfig;
      const fireflyIntensity =
        fireflySource === null ? 0 : fireflySource.intensity * flicker * progress;
      const dx = billboardCameraPosition.x - item.centerX;
      const dy = billboardCameraPosition.y - item.centerY;
      const dz = billboardCameraPosition.z - topZ;
      if (
        fireflySource !== null &&
        fireflyConfig.enabled &&
        fireflyIntensity > fireflyConfig.minVisibleLightIntensity &&
        dx * dx + dy * dy + dz * dz <= fireflyConfig.spawnDistance * fireflyConfig.spawnDistance
      ) {
        emitters.push({
          id: item.object.id,
          x: item.centerX,
          y: item.centerY,
          z: topZ,
          color: fireflySource.color,
          intensity: fireflyIntensity,
          distance: fireflySource.distance,
        });
      }

      if (!lightVisibility.intersects(item.centerX, item.centerY, topZ, lightConfig.distance)) {
        continue;
      }

      item.lightDistanceSquared =
        (camera.position.x - item.centerX) ** 2 +
        (camera.position.y - item.centerY) ** 2 +
        (camera.position.z - topZ) ** 2;
      pixelLight.z = topZ;
      pixelLight.intensity = intensity;
      candidates.push(item);
    }

    candidates.sort(compareLightDistance);
    for (
      let index = 0;
      index < candidates.length && index < FIELD_GRID_MAX_OBJECT_PIXEL_LIGHTS;
      index += 1
    ) {
      const item = candidates[index]!;
      if (item.pixelLight !== null) pixelLights.push(item.pixelLight);
    }

    const simulation = fireflySimulation.current;
    simulation.refreshElapsedSec += delta;
    const maximumLiveFlies = Math.min(fireflyConfig.maxCount, FIREFLY_BUFFER_CAPACITY);
    while (simulation.flies.length > maximumLiveFlies) simulation.flies.pop();
    if (!fireflyConfig.enabled) {
      simulation.clusters = [];
      simulation.refreshElapsedSec = 0;
      simulation.initialized = true;
      for (const fly of simulation.flies) {
        if (fly.retireInSec === null) fly.retireInSec = fireflyConfig.retireDurationSec;
      }
    } else if (
      !simulation.initialized ||
      simulation.refreshElapsedSec >= fireflyConfig.clusterRefreshSec
    ) {
      if (emitters.length > fireflyConfig.clusterMaxEmitters) {
        emitters.sort((left, right) => {
          const leftDistance =
            (billboardCameraPosition.x - left.x) ** 2 +
            (billboardCameraPosition.y - left.y) ** 2 +
            (billboardCameraPosition.z - left.z) ** 2;
          const rightDistance =
            (billboardCameraPosition.x - right.x) ** 2 +
            (billboardCameraPosition.y - right.y) ** 2 +
            (billboardCameraPosition.z - right.z) ** 2;
          return leftDistance - rightDistance;
        });
        emitters.length = fireflyConfig.clusterMaxEmitters;
      }
      simulation.clusters = buildFireflyClusters(
        emitters,
        config.cellSize,
        fireflyConfig,
      );
      simulation.refreshElapsedSec = 0;
      simulation.initialized = true;
      const clustersById = new Map<string, FireflyCluster>();
      for (const cluster of simulation.clusters) {
        clustersById.set(cluster.id, cluster);
      }
      for (const fly of simulation.flies) {
        const cluster = clustersById.get(fly.clusterId);
        if (cluster === undefined) {
          if (fly.retireInSec === null) fly.retireInSec = fireflyConfig.retireDurationSec;
          continue;
        }
        fly.retireInSec = null;
        fly.homeX = cluster.x + fly.homeOffsetX;
        fly.homeY = cluster.y + fly.homeOffsetY;
        fly.homeZ = cluster.z + fly.homeOffsetZ;
        fly.light.color =
          fly.kind === 'scout' && fireflyConfig.differentiateScoutColor
            ? fireflyConfig.scoutColor
            : cluster.color;
      }
    }

    for (let index = simulation.flies.length - 1; index >= 0; index -= 1) {
      const fly = simulation.flies[index]!;
      if (fly.retireInSec !== null) {
        fly.retireInSec = Math.max(0, fly.retireInSec - delta);
      }
      advanceFirefly(fly, delta, fireflyConfig);
      if (
        fly.ageSec >= fly.lifetimeSec ||
        (fly.retireInSec !== null && fly.retireInSec <= 0)
      ) {
        simulation.flies.splice(index, 1);
      }
    }

    const visibleClusters = simulation.clusters
      .filter((cluster) =>
        lightVisibility.intersects(
          cluster.x,
          cluster.y,
          cluster.z,
          Math.max(
            cluster.radius * fireflyConfig.visibleClusterRadiusMultiplier,
            config.cellSize * fireflyConfig.visibleClusterCellMultiplier,
          ),
        ),
      )
      .sort((left, right) => {
        const leftDistance =
          (billboardCameraPosition.x - left.x) ** 2 +
          (billboardCameraPosition.y - left.y) ** 2 +
          (billboardCameraPosition.z - left.z) ** 2;
        const rightDistance =
          (billboardCameraPosition.x - right.x) ** 2 +
          (billboardCameraPosition.y - right.y) ** 2 +
          (billboardCameraPosition.z - right.z) ** 2;
        return leftDistance - rightDistance;
      });

    const targetCounts = new Map<string, number>();
    let targetTotal = 0;
    for (const cluster of visibleClusters) {
      const target = Math.min(
        fireflyTargetCount(cluster, fireflyConfig),
        Math.min(fireflyConfig.maxCount, FIREFLY_BUFFER_CAPACITY) - targetTotal,
      );
      if (target <= 0) break;
      targetCounts.set(cluster.id, target);
      targetTotal += target;
    }

    const currentCounts = new Map<string, number>();
    for (const fly of simulation.flies) {
      if (fly.retireInSec !== null) continue;
      currentCounts.set(fly.clusterId, (currentCounts.get(fly.clusterId) ?? 0) + 1);
    }

    let spawnBudget = 0;
    if (simulation.flies.length === 0 && targetTotal > 0) {
      spawnBudget = Math.min(fireflyConfig.initialSpawnBudget, targetTotal);
      simulation.spawnAccumulatorSec = 0;
    } else {
      simulation.spawnAccumulatorSec += delta;
      if (simulation.spawnAccumulatorSec >= fireflyConfig.spawnIntervalSec) {
        const intervals = Math.floor(
          simulation.spawnAccumulatorSec / fireflyConfig.spawnIntervalSec,
        );
        simulation.spawnAccumulatorSec -= intervals * fireflyConfig.spawnIntervalSec;
        spawnBudget = intervals * fireflyConfig.spawnBudgetPerInterval;
      }
    }
    spawnBudget = Math.min(
      spawnBudget,
      Math.min(fireflyConfig.maxCount, FIREFLY_BUFFER_CAPACITY) - simulation.flies.length,
    );

    while (spawnBudget > 0) {
      const cluster = visibleClusters.find(
        (candidate) =>
          (currentCounts.get(candidate.id) ?? 0) <
          (targetCounts.get(candidate.id) ?? 0),
      );
      if (cluster === undefined) break;
      simulation.flies.push(
        createFirefly(simulation.nextId, cluster, config.cellSize, fireflyConfig),
      );
      simulation.nextId += 1;
      currentCounts.set(
        cluster.id,
        (currentCounts.get(cluster.id) ?? 0) + 1,
      );
      spawnBudget -= 1;
    }

    const mesh = fireflyMesh.current;
    if (mesh !== null) {
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      const opacityValues = fireflyOpacityAttribute.array as Float32Array;
      const colorValues = fireflyColorAttribute.array as Float32Array;
      const flyLights = activeFireflyLights.current;
      flyLights.length = 0;

      for (let index = 0; index < FIREFLY_BUFFER_CAPACITY; index += 1) {
        const fly = simulation.flies[index];
        if (fly === undefined) {
          opacityValues[index] = 0;
          continue;
        }

        opacityValues[index] = fireflyVisualOpacity(fly, fireflyConfig);
        fireflyBillboard.position.set(fly.x, fly.y, fly.z);
        fireflyBillboard.scale.setScalar(fireflyConfig.pixelSize);
        fireflyBillboard.up.set(0, 0, 1);
        fireflyBillboard.lookAt(billboardCameraPosition);
        fireflyBillboard.updateMatrix();
        mesh.setMatrixAt(index, fireflyBillboard.matrix);
        fireflyColor.set(fly.light.color);
        const colorOffset = index * 3;
        colorValues[colorOffset] = fireflyColor.r;
        colorValues[colorOffset + 1] = fireflyColor.g;
        colorValues[colorOffset + 2] = fireflyColor.b;

        if (
          fly.light.intensity > fireflyConfig.minVisibleLightIntensity &&
          lightVisibility.intersects(
            fly.x,
            fly.y,
            fly.z,
            fly.light.distance,
          )
        ) {
          flyLights.push(fly);
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
      fireflyOpacityAttribute.needsUpdate = true;
      fireflyColorAttribute.needsUpdate = true;

      flyLights.sort(
        (left, right) =>
          fireflyCameraDistanceSquared(left, billboardCameraPosition) -
          fireflyCameraDistanceSquared(right, billboardCameraPosition),
      );
      for (
        let index = 0;
        index < flyLights.length &&
        index < fireflyConfig.maxLocalLights &&
        index < FIELD_GRID_MAX_FIREFLY_LIGHTS;
        index += 1
      ) {
        pixelLights.push(flyLights[index]!.light);
      }
    }

    syncFieldGridPixelLights(pixelLights);
  });

  return (
    <group>
      <instancedMesh
        ref={fireflyMesh}
        args={[fireflyGeometry, fireflyMaterial, FIREFLY_BUFFER_CAPACITY]}
        frustumCulled={false}
      />
      {objects.map((object) => (
        <FieldSurfaceObjectColumn
          appearanceDelayMs={resolveAppearanceDelay(appearance, object.id)}
          config={config}
          headers={headers}
          platformHeight={objectPlatformHeight(
            tileSettings.worldSeed,
            object.cell.x,
            object.cell.y,
            tileSettings.objectMinHeight,
            tileSettings.objectMaxHeight,
          )}
          objectGlowConfig={objectGlowConfig}
          key={object.id}
          object={object}
          register={register}
        />
      ))}
    </group>
  );
}

function FieldSurfaceObjectColumn({
  object,
  config,
  headers,
  appearanceDelayMs,
  objectGlowConfig,
  platformHeight,
  register,
}: {
  readonly object: SurfaceObject;
  readonly config: FieldGridConfig;
  readonly headers: AuthenticatedAssetHeaders;
  readonly platformHeight: number;
  readonly objectGlowConfig: FieldConfig['lighting']['objectGlow'];
  readonly appearanceDelayMs: number | null;
  readonly register: (item: RuntimeObject) => () => void;
}): ReactElement {
  const artwork = useRef<Group>(null);
  const platformSize = config.cellSize;
  const artHeight =
    object.pixelObject === null
      ? 0
      : platformSize * (object.pixelObject.canvas.height / object.pixelObject.canvas.width);
  const center = cellCenterOnPlane(object.cell.x, object.cell.y, config);
  const backendLightConfig = object.pixelObject?.light ?? null;
  const lightConfig = useMemo(
    () => resolveSurfaceObjectLightConfig(backendLightConfig, objectGlowConfig),
    [backendLightConfig, objectGlowConfig],
  );
  const initialElapsedMs =
    appearanceDelayMs === null
      ? SURFACE_OBJECT_ANIMATION_CONFIG.riseDurationMs
      : -appearanceDelayMs;
  const initialProgress = surfaceObjectRiseProgress(initialElapsedMs);

  const item = useMemo<RuntimeObject>(
    () => ({
      artwork,
      object,
      centerX: center[0],
      centerY: center[1],
      flickerSeed: surfaceObjectFlickerSeed(object.id),
      platformHeight,
      platformSize,
      artHeight,
      lightConfig,
      backendLightConfig,
      flickerConfig: objectGlowConfig.flicker,
      minimumVisibleIntensity: objectGlowConfig.minimumVisibleIntensity,
      pixelLight:
        lightConfig === null
          ? null
          : {
              x: center[0],
              y: center[1],
              z: 0,
              color: lightConfig.color,
              intensity: 0,
              distance: lightConfig.distance,
            },
      lightDistanceSquared: Number.POSITIVE_INFINITY,
      artworkMaterial: null,
      texture: null,
      cursor: { index: 0, elapsedMs: 0 },
      elapsedMs: initialElapsedMs,
      frame: null,
      billboardUpdated: false,
    }),
    [
      initialElapsedMs,
      artHeight,
      center[0],
      center[1],
      object,
      platformHeight,
      platformSize,
      lightConfig,
      backendLightConfig,
      objectGlowConfig,
    ],
  );

  useEffect(() => register(item), [item, register]);

  const onTextureReady = useCallback(
    (texture: Texture | null): void => {
      item.texture = texture;
      item.frame = null;
    },
    [item],
  );
  const onArtworkMaterialReady = useCallback(
    (material: MeshBasicMaterial | null): void => {
      item.artworkMaterial = material;
      if (material !== null) {
        material.opacity = surfaceObjectRiseProgress(item.elapsedMs);
      }
    },
    [item],
  );

  return (
    <group position={[center[0], center[1], 0]}>
      <group
        ref={artwork}
        position={[
          0,
          0,
          platformHeight * initialProgress +
            artHeight / 2 +
            SURFACE_OBJECT_ANIMATION_CONFIG.artworkOffset,
        ]}
        rotation={[0, 0, 0]}
      >
        <FieldSurfaceObjectArtwork
          size={platformSize}
          headers={headers}
          onMaterialReady={onArtworkMaterialReady}
          onTextureReady={onTextureReady}
          sprite={object.pixelObject}
        />
      </group>
    </group>
  );
}

function advanceArtwork(
  item: RuntimeObject,
  deltaMs: number,
  cameraPosition: Vector3,
  cameraMoved: boolean,
): void {
  const artwork = item.artwork.current;
  const progress = surfaceObjectRiseProgress(item.elapsedMs);
  if (artwork !== null) {
    const z =
      item.platformHeight * progress +
      item.artHeight / 2 +
      SURFACE_OBJECT_ANIMATION_CONFIG.artworkOffset;
    if (artwork.position.z !== z) artwork.position.z = z;

    const hasSprite = item.object.pixelObject !== null;
    if (hasSprite && (!item.billboardUpdated || cameraMoved)) {
      if (!item.billboardUpdated) artwork.up.set(0, 0, 1);
      artwork.lookAt(cameraPosition.x, cameraPosition.y, artwork.position.z);
      item.billboardUpdated = true;
    }
  }

  const sprite = item.object.pixelObject;
  const texture = item.texture;
  if (sprite === null || texture === null) return;
  const frames = sprite.animations[0]?.frames ?? [];
  if (frames.length === 0 || (frames.length === 1 && item.frame !== null)) return;
  const advanced = advanceSpritePlayback(item.cursor, frames, deltaMs);
  item.cursor = advanced.cursor;
  if (advanced.frame === null || advanced.frame === item.frame) return;
  item.frame = advanced.frame;
  setTextureFrame(texture, advanced.frame, sprite.sheet.columns, sprite.sheet.rows);
}

function setTextureFrame(texture: Texture, frame: number, columns: number, rows: number): void {
  const column = frame % columns;
  const row = Math.floor(frame / columns);
  texture.repeat.set(1 / columns, 1 / rows);
  texture.offset.set(column / columns, 1 - (row + 1) / rows);
  texture.updateMatrix();
}

type AppearanceState = {
  readonly delays: ReadonlyMap<string, number>;
  readonly known: ReadonlySet<string>;
};

function useAppearingObjects(objects: readonly SurfaceObject[]): AppearanceState {
  const [appearing, setAppearing] = useState<ReadonlyMap<string, number>>(() =>
    staggerAppearanceDelays(objects.map((object) => object.id)),
  );
  const known = useRef(new Set(objects.map((object) => object.id)));
  const nextAppearanceAt = useRef(
    Date.now() + objects.length * SURFACE_OBJECT_ANIMATION_CONFIG.staggerDelayMs,
  );

  useLayoutEffect(() => {
    const newIds = collectNewObjectIds(objects, known.current);
    for (const object of objects) known.current.add(object.id);
    if (newIds.length > 0) {
      const now = Date.now();
      const firstDelayMs = Math.max(0, nextAppearanceAt.current - now);
      const newAppearanceDelays = staggerAppearanceDelays(newIds, firstDelayMs);
      nextAppearanceAt.current =
        now + firstDelayMs + newIds.length * SURFACE_OBJECT_ANIMATION_CONFIG.staggerDelayMs;
      setAppearing((current) => new Map([...current, ...newAppearanceDelays]));
    }
  }, [objects]);

  useEffect(() => {
    if (appearing.size === 0) return;
    const latestDelayMs = Math.max(...appearing.values());
    const timer = setTimeout(
      () => setAppearing(new Map()),
      SURFACE_OBJECT_ANIMATION_CONFIG.riseDurationMs +
        latestDelayMs +
        SURFACE_OBJECT_ANIMATION_CONFIG.completionBufferMs,
    );
    return () => clearTimeout(timer);
  }, [appearing]);

  return { delays: appearing, known: known.current };
}

function resolveAppearanceDelay(
  appearance: AppearanceState,
  objectId: string,
): number | null {
  const scheduledDelay = appearance.delays.get(objectId);
  if (scheduledDelay !== undefined) return scheduledDelay;
  return appearance.known.has(objectId) ? null : 0;
}

function collectNewObjectIds(
  objects: readonly SurfaceObject[],
  known: ReadonlySet<string>,
): readonly string[] {
  return objects.filter((object) => !known.has(object.id)).map((object) => object.id);
}
