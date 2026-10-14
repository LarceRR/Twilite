import { useFrame } from '@react-three/fiber/native';
import type { ReactElement } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { DirectionalLight, Object3D } from 'three';

import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import type { SurfaceObject } from '@/domains/spaces/domain/entities/SurfaceObject';

import { FieldGridSurface } from './FieldGridSurface';
import { FieldSurfaceObjects } from './FieldSurfaceObjects';
import { FieldWorldAxes } from './FieldWorldAxes';
import { cellCenterOnPlane } from './fieldGridCells';
import type { FieldGridConfig } from './fieldGridConfig';
import { SURFACE_OBJECT_ANIMATION_CONFIG } from './surfaceObjectAnimation';
import {
  FIELD_GRID_MAX_PIXEL_LIGHTS,
  resetFieldGridWaveScene,
} from './fieldGridWaveMaterial';
import {
  resolveSceneShadowIntensity,
  resolveSurfaceObjectLightConfig,
  SurfaceObjectLightVisibility,
  type SurfaceObjectLightingIdentity,
} from './surfaceObjectLighting';
import { useFieldConfig, useFieldGridConfig } from './useFieldConfig';

/** One low-resolution directional shadow map follows the currently visible field. */
export function FieldSpaceScene({
  objects,
  headers,
}: {
  readonly objects: readonly SurfaceObject[];
  readonly headers: AuthenticatedAssetHeaders;
}): ReactElement {
  const showWorldAxes = useSettingsStore((s) => s.developerShowWorldAxes);
  const gridConfig = useFieldGridConfig();

  useEffect(() => () => resetFieldGridWaveScene(), []);

  return (
    <>
      <FieldSceneLighting objects={objects} config={gridConfig} />
      <FieldGridSurface config={gridConfig} />
      <FieldSurfaceObjects config={gridConfig} headers={headers} objects={objects} />
      {showWorldAxes ? <FieldWorldAxes /> : null}
    </>
  );
}

type PositionedShadowLight = SurfaceObjectLightingIdentity & {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly distance: number;
  distanceSquared: number;
};

function compareShadowLightDistance(
  left: PositionedShadowLight,
  right: PositionedShadowLight,
): number {
  return left.distanceSquared - right.distanceSquared;
}

function FieldSceneLighting({
  objects,
  config,
}: {
  readonly objects: readonly SurfaceObject[];
  readonly config: FieldGridConfig;
}): ReactElement {
  const { lighting } = useFieldConfig();
  const lightRef = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const lightSources = useMemo<readonly PositionedShadowLight[]>(
    () =>
      objects.flatMap((object) => {
        const sprite = object.pixelObject;
        const source = resolveSurfaceObjectLightConfig(
          sprite?.light ?? null,
          lighting.objectGlow,
        );
        if (source === null) return [];
        const center = cellCenterOnPlane(object.cell.x, object.cell.y, config);
        return [{
          id: object.id,
          light: source,
          x: center[0],
          y: center[1],
          z:
            SURFACE_OBJECT_ANIMATION_CONFIG.platformHeight +
            lighting.objectGlow.heightAbovePlatform,
          distance: source.distance,
          distanceSquared: Number.POSITIVE_INFINITY,
        }];
      }),
    [objects, config, lighting.objectGlow],
  );
  const lightVisibility = useMemo(() => new SurfaceObjectLightVisibility(), []);
  const candidateLightSources = useRef<PositionedShadowLight[]>([]);
  const visibleLightIdentities = useRef<SurfaceObjectLightingIdentity[]>([]);

  useLayoutEffect(() => {
    const light = lightRef.current;
    if (light === null) return;

    const shadowCamera = light.shadow.camera;
    light.shadow.radius = lighting.shadows.filterRadius;
    shadowCamera.up.set(0, 0, 1);
    shadowCamera.left = lighting.shadows.cameraLeft;
    shadowCamera.right = lighting.shadows.cameraRight;
    shadowCamera.top = lighting.shadows.cameraTop;
    shadowCamera.bottom = lighting.shadows.cameraBottom;
    shadowCamera.near = lighting.shadows.cameraNear;
    shadowCamera.far = lighting.shadows.cameraFar;
    shadowCamera.updateProjectionMatrix();

    const shadowMap = light.shadow.map;
    if (
      shadowMap !== null &&
      (shadowMap.width !== lighting.shadows.mapSizePx ||
        shadowMap.height !== lighting.shadows.mapSizePx)
    ) {
      shadowMap.dispose();
      light.shadow.map = null;
    }
    light.shadow.mapSize.set(
      lighting.shadows.mapSizePx,
      lighting.shadows.mapSizePx,
    );
  }, [
    lighting.shadows.mapSizePx,
    lighting.shadows.filterRadius,
    lighting.shadows.cameraLeft,
    lighting.shadows.cameraRight,
    lighting.shadows.cameraTop,
    lighting.shadows.cameraBottom,
    lighting.shadows.cameraNear,
    lighting.shadows.cameraFar,
  ]);

  useFrame(({ camera, clock }) => {
    const light = lightRef.current;
    if (light === null) return;
    lightVisibility.updateCamera(camera);
    const candidates = candidateLightSources.current;
    candidates.length = 0;
    for (const source of lightSources) {
      if (!lightVisibility.intersects(source.x, source.y, source.z, source.distance)) continue;
      source.distanceSquared =
        (camera.position.x - source.x) ** 2 +
        (camera.position.y - source.y) ** 2 +
        (camera.position.z - source.z) ** 2;
      candidates.push(source);
    }
    candidates.sort(compareShadowLightDistance);

    const visible = visibleLightIdentities.current;
    visible.length = 0;
    for (let index = 0; index < Math.min(candidates.length, FIELD_GRID_MAX_PIXEL_LIGHTS); index += 1) {
      visible.push(candidates[index]!);
    }
    target.position.set(camera.position.x, 0, 0);
    light.position.set(
      camera.position.x + lighting.directionalPosition[0],
      lighting.directionalPosition[1],
      lighting.directionalPosition[2],
    );
    target.updateMatrixWorld();
    light.target.updateMatrixWorld();
    light.shadow.intensity = resolveSceneShadowIntensity(
      visible,
      clock.elapsedTime * 1000,
      lighting,
    );
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
        shadow-mapSize-width={lighting.shadows.mapSizePx}
        shadow-mapSize-height={lighting.shadows.mapSizePx}
        shadow-camera-left={lighting.shadows.cameraLeft}
        shadow-camera-right={lighting.shadows.cameraRight}
        shadow-camera-top={lighting.shadows.cameraTop}
        shadow-camera-bottom={lighting.shadows.cameraBottom}
        shadow-camera-near={lighting.shadows.cameraNear}
        shadow-camera-far={lighting.shadows.cameraFar}
        shadow-bias={lighting.shadows.bias}
        shadow-normalBias={lighting.shadows.normalBias}
      />
    </>
  );
}
