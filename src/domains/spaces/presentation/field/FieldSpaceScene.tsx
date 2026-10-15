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
import { resetFieldGridWaveScene } from './fieldGridWaveMaterial';
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
  const gridConfig = useFieldGridConfig();

  useEffect(() => () => resetFieldGridWaveScene(), []);

  return (
    <>
      <FieldSceneLighting />
      <FieldGridSurface config={gridConfig} objects={objects} />
      <FieldSurfaceObjects config={gridConfig} headers={headers} objects={objects} />
      {showWorldAxes ? <FieldWorldAxes /> : null}
    </>
  );
}

function FieldSceneLighting(): ReactElement {
  const { lighting } = useFieldConfig();
  const lightRef = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const lastShadowFocusX = useRef(Number.NaN);
  useLayoutEffect(() => {
    const light = lightRef.current;
    if (light === null) return;

    // The field is mostly static. Rendering a moving 1024² shadow map on every
    // frame wastes GPU time and battery, especially during screen recording.
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    const shadowCamera = light.shadow.camera;
    light.shadow.radius = lighting.shadows.filterRadius;
    light.shadow.intensity = lighting.shadows.baselineIntensity;
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
    light.shadow.needsUpdate = true;
  }, [
    lighting.shadows.mapSizePx,
    lighting.shadows.filterRadius,
    lighting.shadows.cameraLeft,
    lighting.shadows.cameraRight,
    lighting.shadows.cameraTop,
    lighting.shadows.cameraBottom,
    lighting.shadows.cameraNear,
    lighting.shadows.cameraFar,
    lighting.shadows.baselineIntensity,
  ]);

  useFrame(({ camera }) => {
    const light = lightRef.current;
    if (light === null) return;
    const focusX = camera.position.x + SHADOW_FOCUS_AHEAD;
    const previousFocusX = lastShadowFocusX.current;
    if (
      Number.isFinite(previousFocusX) &&
      Math.abs(focusX - previousFocusX) < SHADOW_REFRESH_DISTANCE
    ) {
      return;
    }

    lastShadowFocusX.current = focusX;
    target.position.set(focusX, 0, 0);
    light.position.set(
      focusX + lighting.directionalPosition[0],
      lighting.directionalPosition[1],
      lighting.directionalPosition[2],
    );
    target.updateMatrixWorld();
    light.target.updateMatrixWorld();
    light.shadow.needsUpdate = true;
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
