import { useFrame } from '@react-three/fiber/native';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DirectionalLight, Object3D } from 'three';

import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import type { SurfaceObject } from '@/domains/spaces/domain/entities/SurfaceObject';

import { FieldPerformanceMonitor } from './FieldPerformanceMonitor';
import { FieldGridSurface } from './FieldGridSurface';
import { FieldSurfaceObjects } from './FieldSurfaceObjects';
import { FieldWorldAxes } from './FieldWorldAxes';
import { resetFieldGridWaveScene } from './fieldGridWaveMaterial';
import { syncFieldCloudLightDirection } from './fieldCloudShadows';
import { consumeFieldShadowUpdate, requestFieldShadowUpdate } from './fieldShadowInvalidation';
import { useFieldTileStore } from './fieldTileStore';
import { useFieldConfig, useFieldGridConfig } from './useFieldConfig';

/**
 * The camera looks along +X at a shallow angle, so the ground it actually sees
 * starts a few hundred units ahead of it. The shadow frustum is centred there
 * instead of directly under the camera, so every visible tile receives shadows.
 */
const SHADOW_FOCUS_AHEAD = 900;
/** Refresh the shared shadow map only after a meaningful camera shift. */
const SHADOW_REFRESH_DISTANCE = 120;

/** One directional shadow map follows the currently visible field. */
export function FieldSpaceScene({
  objects,
  headers,
}: {
  readonly objects: readonly SurfaceObject[];
  readonly headers: AuthenticatedAssetHeaders;
}): ReactElement {
  const showWorldAxes = useSettingsStore((s) => s.developerShowWorldAxes);
  const configuredGrid = useFieldGridConfig();
  // Cell dividers are purely visual; coordinates, pitch and the surface remain unchanged.
  const gridConfig = useMemo(() => ({ ...configuredGrid, showDividers: false }), [configuredGrid]);
  const fieldConfig = useFieldConfig();
  const [loadedChunkIndices, setLoadedChunkIndices] = useState<readonly number[]>([]);
  const loadedChunkSet = useMemo(() => new Set(loadedChunkIndices), [loadedChunkIndices]);
  const loadedObjects = useMemo(
    () =>
      objects.filter((object) =>
        loadedChunkSet.has(Math.floor(object.cell.x / fieldConfig.chunks.cols)),
      ),
    [objects, loadedChunkSet, fieldConfig.chunks.cols],
  );
  const handleLoadedChunkIndicesChange = useCallback((nextIndices: readonly number[]) => {
    setLoadedChunkIndices((current) => {
      if (
        current.length === nextIndices.length &&
        current.every((chunkIndex, index) => chunkIndex === nextIndices[index])
      ) {
        return current;
      }
      return [...nextIndices];
    });
  }, []);

  useEffect(() => () => resetFieldGridWaveScene(), []);

  return (
    <>
      <FieldPerformanceMonitor />
      <FieldSceneLighting objects={loadedObjects} />
      <FieldGridSurface
        config={gridConfig}
        objects={loadedObjects}
        onLoadedChunkIndicesChange={handleLoadedChunkIndicesChange}
      />
      {loadedObjects.length > 0 ? (
        <FieldSurfaceObjects
          config={gridConfig}
          headers={headers}
          objects={loadedObjects}
          loadedChunkIndices={loadedChunkIndices}
        />
      ) : null}
      {showWorldAxes ? <FieldWorldAxes /> : null}
    </>
  );
}

function FieldSceneLighting({
  objects,
}: {
  readonly objects: readonly SurfaceObject[];
}): ReactElement {
  const { lighting, platform } = useFieldConfig();
  const tileWorldSeed = useFieldTileStore((s) => s.worldSeed);
  const tileMinHeight = useFieldTileStore((s) => s.tileMinHeight);
  const tileMaxHeight = useFieldTileStore((s) => s.tileMaxHeight);
  const objectMinHeight = useFieldTileStore((s) => s.objectMinHeight);
  const objectMaxHeight = useFieldTileStore((s) => s.objectMaxHeight);
  const generatedTilesEnabled = useFieldTileStore((s) => s.generatedTilesEnabled);
  const lightRef = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const lastShadowFocusX = useRef(Number.NaN);
  const shadowRefreshElapsed = useRef(0);
  const [appliedShadows, setAppliedShadows] = useState(lighting.shadows);

  // Shadow-map settings are expensive. Apply a single coherent snapshot after
  // the developer stops dragging a slider instead of reallocating GPU maps per tick.
  useEffect(() => {
    const timeout = setTimeout(() => setAppliedShadows(lighting.shadows), 180);
    return () => clearTimeout(timeout);
  }, [lighting.shadows]);
  useLayoutEffect(() => {
    syncFieldCloudLightDirection(lighting.directionalPosition);
    const light = lightRef.current;
    if (light === null) return;

    // The field is mostly static. Rendering a moving shadow map on every
    // frame wastes GPU time and battery, especially during screen recording.
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    const shadowCamera = light.shadow.camera;
    shadowCamera.up.set(0, 0, 1);
    light.shadow.radius = appliedShadows.filterRadius;
    light.shadow.intensity = appliedShadows.baselineIntensity;
    shadowCamera.left = appliedShadows.cameraLeft;
    shadowCamera.right = appliedShadows.cameraRight;
    shadowCamera.top = appliedShadows.cameraTop;
    shadowCamera.bottom = appliedShadows.cameraBottom;
    shadowCamera.near = appliedShadows.cameraNear;
    shadowCamera.far = appliedShadows.cameraFar;
    shadowCamera.updateProjectionMatrix();

    const shadowMap = light.shadow.map;
    if (
      shadowMap !== null &&
      (shadowMap.width !== appliedShadows.mapSizePx ||
        shadowMap.height !== appliedShadows.mapSizePx)
    ) {
      shadowMap.dispose();
      light.shadow.map = null;
    }
    light.shadow.mapSize.set(
      appliedShadows.mapSizePx,
      appliedShadows.mapSizePx,
    );
    lastShadowFocusX.current = Number.NaN;
    requestFieldShadowUpdate();
    light.shadow.needsUpdate = true;
  }, [
    appliedShadows.mapSizePx,
    appliedShadows.filterRadius,
    appliedShadows.cameraLeft,
    appliedShadows.cameraRight,
    appliedShadows.cameraTop,
    appliedShadows.cameraBottom,
    appliedShadows.cameraNear,
    appliedShadows.cameraFar,
    appliedShadows.baselineIntensity,
    lighting.directionalPosition[0],
    lighting.directionalPosition[1],
    lighting.directionalPosition[2],
  ]);

  useEffect(() => {
    requestFieldShadowUpdate();
  }, [
    objects,
    platform.height,
    platform.cornerRadius,
    platform.edgeBevel,
    tileWorldSeed,
    tileMinHeight,
    tileMaxHeight,
    objectMinHeight,
    objectMaxHeight,
    generatedTilesEnabled,
  ]);

  useFrame(({ camera }, delta) => {
    const light = lightRef.current;
    if (light === null) return;
    shadowRefreshElapsed.current += delta;
    const focusX = camera.position.x + SHADOW_FOCUS_AHEAD;
    const previousFocusX = lastShadowFocusX.current;
    if (
      !Number.isFinite(previousFocusX) ||
      Math.abs(focusX - previousFocusX) >= SHADOW_REFRESH_DISTANCE
    ) {
      lastShadowFocusX.current = focusX;
      target.position.set(focusX, 0, 0);
      light.position.set(
        focusX + lighting.directionalPosition[0],
        lighting.directionalPosition[1],
        lighting.directionalPosition[2],
      );
      target.updateMatrixWorld();
      light.target.updateMatrixWorld();
      requestFieldShadowUpdate();
    }

    if (shadowRefreshElapsed.current >= 0.1 && consumeFieldShadowUpdate()) {
      light.shadow.needsUpdate = true;
      shadowRefreshElapsed.current = 0;
    }
  });

  return (
    <>
      <ambientLight intensity={lighting.ambientIntensity} />
      <primitive object={target} />
      <directionalLight
        ref={lightRef}
        target={target}
        castShadow
        position={[...lighting.directionalPosition]}
        intensity={lighting.directionalIntensity}
        shadow-mapSize-width={appliedShadows.mapSizePx}
        shadow-mapSize-height={appliedShadows.mapSizePx}
        shadow-camera-left={appliedShadows.cameraLeft}
        shadow-camera-right={appliedShadows.cameraRight}
        shadow-camera-top={appliedShadows.cameraTop}
        shadow-camera-bottom={appliedShadows.cameraBottom}
        shadow-camera-near={appliedShadows.cameraNear}
        shadow-camera-far={appliedShadows.cameraFar}
        shadow-bias={appliedShadows.bias}
        shadow-normalBias={appliedShadows.normalBias}
      />
    </>
  );
}
