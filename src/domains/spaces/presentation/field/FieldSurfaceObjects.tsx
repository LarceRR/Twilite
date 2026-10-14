import { useFrame } from '@react-three/fiber/native';
import type { ReactElement, RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Color,
  DoubleSide,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type PointLight,
  type Texture,
} from 'three';

import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import type { SurfaceObject } from '@/domains/spaces/domain/entities/SurfaceObject';
import type { PixelObjectLightDto } from '@/shared/contracts';
import { useThemeColors } from '@/design-system/colors/colors';

import { FieldSurfaceObjectArtwork } from './FieldSurfaceObjectArtwork';
import { cellCenterOnPlane } from './fieldGridCells';
import type { FieldConfig } from './fieldConfig';
import {
  FIELD_GRID_OVERLAY_RENDER_ORDER,
  type FieldGridConfig,
} from './fieldGridConfig';
import {
  createFieldGridWaveMaterial,
  registerFieldGridWaveMaterial,
  FIELD_GRID_MAX_PIXEL_LIGHTS,
  syncFieldGridPixelLights,
  type FieldGridPixelLight,
  type FieldGridWaveMaterial,
} from './fieldGridWaveMaterial';
import {
  candleFlickerMultiplier,
  resolveSurfaceObjectLightConfig,
  surfaceObjectFlickerSeed,
  SurfaceObjectLightVisibility,
} from './surfaceObjectLighting';
import {
  advanceSpritePlayback,
  surfaceObjectRiseProgress,
  type SpritePlaybackCursor,
  SURFACE_OBJECT_ANIMATION_CONFIG,
  staggerAppearanceDelays,
} from './surfaceObjectAnimation';
import {
  createPixelCirclePlatformGeometry,
  createPixelCircleTopGeometry,
} from './fieldPixelCircleGeometry';
import { useFieldConfig } from './useFieldConfig';

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
  readonly lightHeightAbovePlatform: number;
  readonly artHeight: number;
  readonly lightConfig: PixelObjectLightDto | null;
  readonly flickerConfig: FieldConfig['lighting']['objectGlow']['flicker'];
  readonly minimumVisibleIntensity: number;
  castsLocalShadow: boolean;
  readonly waveMaterial: FieldGridWaveMaterial;
  unregisterWaveMaterial: (() => void) | null;
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

function setLocalShadowCasting(
  item: RuntimeObject,
  enabled: boolean,
  mapSizePx: number,
  filterRadius: number,
  shadowIntensity: number,
): void {
  const light = item.light.current;
  if (light === null) {
    item.castsLocalShadow = false;
    return;
  }

  const shadow = light.shadow;
  if (shadow.mapSize.width !== mapSizePx || shadow.mapSize.height !== mapSizePx) {
    shadow.mapSize.set(mapSizePx, mapSizePx);
  }
  if (shadow.camera.near !== 1 || shadow.camera.far !== light.distance) {
    shadow.camera.near = 1;
    shadow.camera.far = Math.max(2, light.distance);
    shadow.camera.updateProjectionMatrix();
  }
  shadow.bias = -0.0008;
  shadow.normalBias = 0.025;
  shadow.radius = filterRadius;
  shadow.intensity = shadowIntensity;

  if (item.castsLocalShadow !== enabled) {
    item.castsLocalShadow = enabled;
    light.castShadow = enabled;
  }
}

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
  const fieldConfig = useFieldConfig();
  const lightingConfig = fieldConfig.lighting;
  const platformPixelResolution = fieldConfig.platform.pixelResolution;
  const platformColor = useMemo(
    () =>
      new Color(surfaceRaised).lerp(
        new Color(lightingConfig.surfaceAmbientColor),
        lightingConfig.surfaceAmbientIntensity,
      ),
    [
      surfaceRaised,
      lightingConfig.surfaceAmbientColor,
      lightingConfig.surfaceAmbientIntensity,
    ],
  );
  const objectGlowConfig = lightingConfig.objectGlow;
  const shadowConfig = lightingConfig.shadows;
  const lastBillboardCameraXY = useRef({ x: Number.NaN, y: Number.NaN });
  const lightVisibility = useMemo(() => new SurfaceObjectLightVisibility(), []);
  const lightCandidates = useRef<RuntimeObject[]>([]);
  const activePixelLights = useRef<FieldGridPixelLight[]>([]);

  const register = useCallback((item: RuntimeObject): (() => void) => {
    runtime.current.set(item.object.id, item);
    return () => {
      runtime.current.delete(item.object.id);
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
      advanceColumn(item, delta * 1000);
      advanceArtwork(item, delta * 1000, billboardCameraPosition, cameraMoved);

      const platformInView = lightVisibility.intersects(
        item.centerX,
        item.centerY,
        item.platformHeight / 2 + item.artHeight / 2,
        item.platformSize * 1.25,
      );
      if (platformInView && item.unregisterWaveMaterial === null) {
        item.unregisterWaveMaterial = registerFieldGridWaveMaterial(item.waveMaterial);
      } else if (!platformInView && item.unregisterWaveMaterial !== null) {
        item.unregisterWaveMaterial();
        item.unregisterWaveMaterial = null;
      }

      const lightConfig = item.lightConfig;
      const light = item.light.current;
      if (lightConfig === null || light === null || item.pixelLight === null) {
        setLocalShadowCasting(
          item,
          false,
          shadowConfig.localShadowMapSizePx,
          shadowConfig.filterRadius,
          shadowConfig.localShadowIntensity,
        );
        if (light !== null) light.visible = false;
        continue;
      }

      const progress = surfaceObjectRiseProgress(item.elapsedMs);
      const intensity =
        lightConfig.intensity *
        candleFlickerMultiplier(
          clock.elapsedTime * 1000,
          item.flickerSeed,
          item.flickerConfig,
        ) * progress;
      if (light.intensity !== intensity) light.intensity = intensity;
      if (intensity <= item.minimumVisibleIntensity) {
        light.visible = false;
        setLocalShadowCasting(
          item,
          false,
          shadowConfig.localShadowMapSizePx,
          shadowConfig.filterRadius,
          shadowConfig.localShadowIntensity,
        );
        continue;
      }

      const platformTopZ = item.platformHeight * progress;
      const z = platformTopZ + item.lightHeightAbovePlatform;
      if (light.position.z !== z) light.position.z = z;
      if (!lightVisibility.intersects(item.centerX, item.centerY, z, lightConfig.distance)) {
        light.visible = false;
        setLocalShadowCasting(
          item,
          false,
          shadowConfig.localShadowMapSizePx,
          shadowConfig.filterRadius,
          shadowConfig.localShadowIntensity,
        );
        continue;
      }

      item.lightDistanceSquared =
        (camera.position.x - item.centerX) ** 2 +
        (camera.position.y - item.centerY) ** 2 +
        (camera.position.z - z) ** 2;
      item.pixelLight.z = z;
      item.pixelLight.platformTopZ = platformTopZ;
      item.pixelLight.platformHalfSize = item.platformSize / 2;
      item.pixelLight.intensity = intensity;
      candidates.push(item);
    }

    // Prioritize the nearest sources whose falloff spheres can affect this view.
    candidates.sort(compareLightDistance);
    for (let index = 0; index < candidates.length; index += 1) {
      const item = candidates[index]!;
      const light = item.light.current;
      const isActive = index < FIELD_GRID_MAX_PIXEL_LIGHTS;
      if (light !== null) light.visible = isActive;
      setLocalShadowCasting(
        item,
        isActive && index < shadowConfig.localShadowLights,
        shadowConfig.localShadowMapSizePx,
        shadowConfig.filterRadius,
        shadowConfig.localShadowIntensity,
      );
      if (isActive && item.pixelLight !== null) pixelLights.push(item.pixelLight);
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
          platformHeight={fieldConfig.platform.height}
          platformPixelResolution={platformPixelResolution}
          objectGlowConfig={objectGlowConfig}
          platformColor={platformColor}
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
  platformColor,
  platformHeight,
  platformPixelResolution,
  register,
}: {
  readonly object: SurfaceObject;
  readonly config: FieldGridConfig;
  readonly headers: AuthenticatedAssetHeaders;
  readonly platformHeight: number;
  readonly platformPixelResolution: number;
  readonly objectGlowConfig: FieldConfig['lighting']['objectGlow'];
  readonly appearanceDelayMs: number | null;
  readonly platformColor: Color;
  readonly register: (item: RuntimeObject) => () => void;
}): ReactElement {
  const column = useRef<Mesh>(null);
  const artwork = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const waveOverlay = useRef<Mesh>(null);
  const platformSize = config.cellSize;
  const platformGeometry = useMemo(
    () => createPixelCirclePlatformGeometry(platformSize, platformHeight, platformPixelResolution),
    [platformSize, platformHeight, platformPixelResolution],
  );
  const platformTopGeometry = useMemo(
    () => createPixelCircleTopGeometry(platformSize, platformPixelResolution),
    [platformSize, platformPixelResolution],
  );
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
      waveMaterial,
      unregisterWaveMaterial: null,
      centerX: center[0],
      centerY: center[1],
      flickerSeed: surfaceObjectFlickerSeed(object.id),
      platformHeight,
      platformSize,
      lightHeightAbovePlatform: objectGlowConfig.heightAbovePlatform,
      artHeight,
      lightConfig,
      flickerConfig: objectGlowConfig.flicker,
      minimumVisibleIntensity: objectGlowConfig.minimumVisibleIntensity,
      castsLocalShadow: false,
      pixelLight: lightConfig === null
        ? null
        : {
            x: center[0],
            y: center[1],
            z: 0,
            color: lightConfig.color,
            intensity: 0,
            distance: lightConfig.distance,
            platformTopZ: platformHeight,
            platformHalfSize: platformSize / 2,
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
      waveMaterial,
    ],
  );

  useEffect(() => {
    const unregisterRuntime = register(item);
    return () => {
      item.unregisterWaveMaterial?.();
      item.unregisterWaveMaterial = null;
      unregisterRuntime();
    };
  }, [item, register]);

  useEffect(() => () => platformGeometry.dispose(), [platformGeometry]);
  useEffect(() => () => platformTopGeometry.dispose(), [platformTopGeometry]);

  useEffect(() => () => waveMaterial.dispose(), [waveMaterial]);

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
      <mesh
        ref={column}
        castShadow
        receiveShadow
        visible={initialProgress > 0}
        position={[0, 0, (platformHeight * initialProgress) / 2]}
        scale={[1, 1, initialProgress]}
        geometry={platformGeometry}
      >
        <meshLambertMaterial color={platformColor} side={DoubleSide} />
      </mesh>
      <mesh
        ref={waveOverlay}
        geometry={platformTopGeometry}
        visible={initialProgress > 0}
        position={[0, 0, platformHeight * initialProgress + 0.2]}
        renderOrder={FIELD_GRID_OVERLAY_RENDER_ORDER}
      >
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
      </group>
      {lightConfig === null ? null : (
        <pointLight
          ref={light}
          position={[0, 0, platformHeight + objectGlowConfig.heightAbovePlatform]}
          color={lightConfig.color}
          intensity={lightConfig.intensity}
          distance={lightConfig.distance}
          decay={objectGlowConfig.decay}
          castShadow={false}
        />
      )}
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
