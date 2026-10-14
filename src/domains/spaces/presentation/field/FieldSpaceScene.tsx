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
import { resolveSceneShadowIntensity } from './surfaceObjectLighting';
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
      <FieldSceneLighting objects={objects} />
      <FieldGridSurface config={gridConfig} />
      <FieldSurfaceObjects config={gridConfig} headers={headers} objects={objects} />
      {showWorldAxes ? <FieldWorldAxes /> : null}
    </>
  );
}

function FieldSceneLighting({
  objects,
}: {
  readonly objects: readonly SurfaceObject[];
}): ReactElement {
  const { lighting } = useFieldConfig();
  const lightRef = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const lightIdentities = useMemo(
    () => objects.map((object) => ({
      id: object.id,
      light: object.pixelObject?.light ?? null,
    })),
    [objects],
  );

  useLayoutEffect(() => {
    const light = lightRef.current;
    if (light === null) return;
    light.shadow.camera.up.set(0, 0, 1);
    light.shadow.camera.updateProjectionMatrix();
  }, []);

  useFrame(({ camera, clock }) => {
    const light = lightRef.current;
    if (light === null) return;
    target.position.set(camera.position.x, 0, 0);
    light.position.set(
      camera.position.x + lighting.directionalPosition[0],
      lighting.directionalPosition[1],
      lighting.directionalPosition[2],
    );
    target.updateMatrixWorld();
    light.target.updateMatrixWorld();
    light.shadow.intensity = resolveSceneShadowIntensity(
      lightIdentities,
      clock.elapsedTime * 1000,
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
        shadow-mapSize-width={256}
        shadow-mapSize-height={256}
        shadow-camera-left={-1200}
        shadow-camera-right={1200}
        shadow-camera-top={700}
        shadow-camera-bottom={-700}
        shadow-camera-near={0.1}
        shadow-camera-far={4000}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
    </>
  );
}
