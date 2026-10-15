import { useFrame } from '@react-three/fiber/native';
import type { ReactElement, RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Vector3,
  type Group,
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
  FIELD_GRID_MAX_PIXEL_LIGHTS,
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

const billboardCameraPosition = new Vector3();

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
  const lastBillboardCameraXY = useRef({ x: Number.NaN, y: Number.NaN });
  const lightVisibility = useMemo(() => new SurfaceObjectLightVisibility(), []);
  const lightCandidates = useRef<RuntimeObject[]>([]);
  const activePixelLights = useRef<FieldGridPixelLight[]>([]);

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
      index < candidates.length && index < FIELD_GRID_MAX_PIXEL_LIGHTS;
      index += 1
    ) {
      const item = candidates[index]!;
      if (item.pixelLight !== null) pixelLights.push(item.pixelLight);
    }

    syncFieldGridPixelLights(pixelLights);
  });

  return (
    <group>
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
