import { useFrame } from '@react-three/fiber/native';
import type { ReactElement, RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type Group, type Mesh, type MeshBasicMaterial, type PointLight, type Texture, Vector3 } from 'three';

import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import type { SurfaceObject } from '@/domains/spaces/domain/entities/SurfaceObject';
import type { PixelObjectLightDto } from '@/shared/contracts';
import { useThemeColors } from '@/design-system/colors/colors';

import { FieldSurfaceObjectArtwork } from './FieldSurfaceObjectArtwork';
import { cellCenterOnPlane } from './fieldGridCells';
import type { FieldGridConfig } from './fieldGridConfig';
import {
  createFieldGridWaveMaterial,
  registerFieldGridWaveMaterial,
  syncFieldGridPixelLights,
  type FieldGridPixelLight,
} from './fieldGridWaveMaterial';
import {
  candleFlickerMultiplier,
  surfaceObjectFlickerSeed,
} from './surfaceObjectLighting';
import {
  advanceSpritePlayback,
  surfaceObjectRiseProgress,
  type SpritePlaybackCursor,
  SURFACE_OBJECT_ANIMATION_CONFIG,
  staggerAppearanceDelays,
} from './surfaceObjectAnimation';

const billboardCameraPosition = new Vector3();

type RuntimeObject = {
  readonly column: RefObject<Mesh | null>;
  readonly artwork: RefObject<Group | null>;
  readonly light: RefObject<PointLight | null>;
  readonly waveOverlay: RefObject<Mesh | null>;
  readonly object: SurfaceObject;
  readonly centerX: number;
  readonly centerY: number;
  readonly flickerSeed: number;
  readonly platformHeight: number;
  readonly platformSize: number;
  readonly artHeight: number;
  readonly lightConfig: PixelObjectLightDto | null;
  artworkMaterial: MeshBasicMaterial | null;
  texture: Texture | null;
  cursor: SpritePlaybackCursor;
  elapsedMs: number;
  frame: number | null;
  billboardUpdated: boolean;
};

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
  const { surfaceRaised } = useThemeColors();
  const lastBillboardCameraXY = useRef({ x: Number.NaN, y: Number.NaN });

  const register = useCallback((item: RuntimeObject): (() => void) => {
    runtime.current.set(item.object.id, item);
    return () => {
      runtime.current.delete(item.object.id);
    };
  }, []);

  useFrame(({ camera, clock }, delta) => {
    camera.getWorldPosition(billboardCameraPosition);
    const cameraMoved =
      billboardCameraPosition.x !== lastBillboardCameraXY.current.x ||
      billboardCameraPosition.y !== lastBillboardCameraXY.current.y;
    if (cameraMoved) {
      lastBillboardCameraXY.current.x = billboardCameraPosition.x;
      lastBillboardCameraXY.current.y = billboardCameraPosition.y;
    }

    const pixelLights: FieldGridPixelLight[] = [];
    for (const item of runtime.current.values()) {
      advanceColumn(item, delta * 1000);
      advanceArtwork(item, delta * 1000, billboardCameraPosition, cameraMoved);

      const lightConfig = item.lightConfig;
      const light = item.light.current;
      if (lightConfig === null || light === null) continue;

      const progress = surfaceObjectRiseProgress(item.elapsedMs);
      const intensity =
        lightConfig.intensity *
        candleFlickerMultiplier(clock.elapsedTime * 1000, item.flickerSeed) *
        progress;
      if (light.intensity !== intensity) light.intensity = intensity;
      if (intensity <= 0.005) continue;

      pixelLights.push({
        x: item.centerX,
        y: item.centerY,
        z: item.artwork.current?.position.z ?? item.platformHeight,
        color: lightConfig.color,
        intensity,
        distance: lightConfig.distance,
      });
    }

    // One bounded uniform array updates all visible field and platform overlays.
    syncFieldGridPixelLights(pixelLights);
  });

  return (
    <group>
      {objects.map((object) => (
        <FieldSurfaceObjectColumn
          appearanceDelayMs={resolveAppearanceDelay(appearance, object.id)}
          config={config}
          headers={headers}
          platformColor={surfaceRaised}
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
  platformColor,
  register,
}: {
  readonly object: SurfaceObject;
  readonly config: FieldGridConfig;
  readonly headers: AuthenticatedAssetHeaders;
  readonly appearanceDelayMs: number | null;
  readonly platformColor: string;
  readonly register: (item: RuntimeObject) => () => void;
}): ReactElement {
  const column = useRef<Mesh>(null);
  const artwork = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const waveOverlay = useRef<Mesh>(null);
  const platformHeight = SURFACE_OBJECT_ANIMATION_CONFIG.platformHeight;
  const platformSize = config.cellSize;
  const artHeight =
    object.pixelObject === null
      ? 0
      : platformSize * (object.pixelObject.canvas.height / object.pixelObject.canvas.width);
  const center = cellCenterOnPlane(object.cell.x, object.cell.y, config);
  const lightConfig = object.pixelObject?.light ?? null;
  const waveMaterial = useMemo(() => createFieldGridWaveMaterial(), []);
  const initialElapsedMs =
    appearanceDelayMs === null
      ? SURFACE_OBJECT_ANIMATION_CONFIG.riseDurationMs
      : -appearanceDelayMs;
  const initialProgress = surfaceObjectRiseProgress(initialElapsedMs);
  const item = useMemo<RuntimeObject>(
    () => ({
      column,
      artwork,
      light,
      waveOverlay,
      object,
      centerX: center[0],
      centerY: center[1],
      flickerSeed: surfaceObjectFlickerSeed(object.id),
      platformHeight,
      platformSize,
      artHeight,
      lightConfig,
      artworkMaterial: null,
      texture: null,
      cursor: { index: 0, elapsedMs: 0 },
      elapsedMs: initialElapsedMs,
      frame: null,
      billboardUpdated: false,
    }),
    [initialElapsedMs, artHeight, center[0], center[1], object, platformHeight, platformSize, lightConfig],
  );

  useEffect(() => register(item), [item, register]);

  useEffect(() => {
    const unregister = registerFieldGridWaveMaterial(waveMaterial);
    return () => {
      unregister();
      waveMaterial.dispose();
    };
  }, [waveMaterial]);

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
      if (material !== null) material.opacity = surfaceObjectRiseProgress(item.elapsedMs);
    },
    [item],
  );

  return (
    <group position={[center[0], center[1], 0]}>
      <mesh
        ref={column}
        castShadow
        receiveShadow
        visible={initialProgress > 0}
        position={[0, 0, (platformHeight * initialProgress) / 2]}
        scale={[1, 1, initialProgress]}
      >
        <boxGeometry args={[platformSize, platformSize, platformHeight]} />
        <meshLambertMaterial color={platformColor} />
      </mesh>
      <mesh
        ref={waveOverlay}
        visible={initialProgress > 0}
        position={[0, 0, platformHeight * initialProgress + 0.2]}
      >
        <planeGeometry args={[platformSize, platformSize]} />
        <primitive object={waveMaterial} attach="material" />
      </mesh>
      <group ref={artwork} rotation={[0, 0, 0]}>
        <FieldSurfaceObjectArtwork
          size={platformSize}
          headers={headers}
          onMaterialReady={onArtworkMaterialReady}
          onTextureReady={onTextureReady}
          sprite={object.pixelObject}
        />
        {lightConfig === null ? null : (
          <pointLight
            ref={light}
            color={lightConfig.color}
            intensity={lightConfig.intensity}
            distance={lightConfig.distance}
            decay={2}
            castShadow={false}
          />
        )}
      </group>
    </group>
  );
}

function advanceColumn(item: RuntimeObject, deltaMs: number): void {
  const duration = SURFACE_OBJECT_ANIMATION_CONFIG.riseDurationMs;
  if (item.elapsedMs >= duration) {
    if (item.column.current !== null) {
      if (!item.column.current.visible) item.column.current.visible = true;
      if (item.column.current.scale.z !== 1) item.column.current.scale.z = 1;
      if (item.column.current.position.z !== item.platformHeight / 2) {
        item.column.current.position.z = item.platformHeight / 2;
      }
    }
    if (item.waveOverlay.current !== null) {
      if (!item.waveOverlay.current.visible) item.waveOverlay.current.visible = true;
      const overlayZ = item.platformHeight + 0.2;
      if (item.waveOverlay.current.position.z !== overlayZ) item.waveOverlay.current.position.z = overlayZ;
    }
    if (item.artworkMaterial !== null && item.artworkMaterial.opacity !== 1) {
      item.artworkMaterial.opacity = 1;
    }
    if (item.artwork.current !== null) {
      const finalZ = item.platformHeight + item.artHeight / 2 + SURFACE_OBJECT_ANIMATION_CONFIG.artworkOffset;
      if (item.artwork.current.position.z !== finalZ) item.artwork.current.position.z = finalZ;
    }
    return;
  }

  item.elapsedMs = Math.min(duration, item.elapsedMs + deltaMs);
  const progress = surfaceObjectRiseProgress(item.elapsedMs);
  const height = item.platformHeight * progress;
  if (item.column.current !== null) {
    item.column.current.visible = progress > 0;
    item.column.current.scale.z = progress;
    item.column.current.position.z = height / 2;
  }
  if (item.waveOverlay.current !== null) {
    item.waveOverlay.current.visible = progress > 0;
    item.waveOverlay.current.position.z = height + 0.2;
  }
  if (item.artworkMaterial !== null) item.artworkMaterial.opacity = progress;
  if (item.artwork.current !== null) {
    item.artwork.current.position.z =
      height + item.artHeight / 2 + SURFACE_OBJECT_ANIMATION_CONFIG.artworkOffset;
  }
}

function advanceArtwork(
  item: RuntimeObject,
  deltaMs: number,
  cameraPosition: Vector3,
  cameraMoved: boolean,
): void {
  const artwork = item.artwork.current;
  const hasSprite = item.object.pixelObject !== null;
  if (artwork !== null && hasSprite && (!item.billboardUpdated || cameraMoved)) {
    if (!item.billboardUpdated) artwork.up.set(0, 0, 1);
    artwork.lookAt(cameraPosition.x, cameraPosition.y, artwork.position.z);
    item.billboardUpdated = true;
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
