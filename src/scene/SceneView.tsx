import { Canvas } from '@react-three/fiber/native';
import { memo, type ReactElement, useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { useColorSchemeToken, useSceneSkyColors } from '@/design-system/colors/colors';
import {
  selectSurfaceBackground,
  useSettingsStore,
} from '@/domains/settings/presentation/stores/settingsStore';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import type { SurfaceBounds } from '@/domains/surfaces/domain/value-objects/SurfaceBounds';
import type { Logger } from '@/shared/logger';
import { cameraConfig, defaultCameraDistance, defaultVisibleRows } from './camera/cameraConfig';
import { useInitialFraming } from './camera/useInitialFraming';
import { SurfaceOrbitControls } from './controls/SurfaceOrbitControls';
import { patchExpoGlPixelStorei } from './gl/patchExpoGlPixelStorei';
import { Scene } from './Scene';
import { useCameraStore } from './stores/cameraStore';
import { cellToWorld } from './surface/cellToWorld';
import { resolveSurfaceLayout } from './surface/surfaceLayout';
import { resolveSurfaceBackground } from './surface/surfaceTheme';

export type SceneViewProps = {
  readonly bounds: SurfaceBounds | null;
  readonly logger: Logger;
  readonly spaceKey?: string | null;
};
function SceneViewComponent({ bounds, logger, spaceKey = null }: SceneViewProps): ReactElement {
  const { height } = useWindowDimensions();
  const setDefaultDistance = useCameraStore((state) => state.setDefaultDistance);
  const setMapCenter = useCameraStore((state) => state.setMapCenter);
  const setTarget = useCameraStore((state) => state.setTarget);
  const scheme = useColorSchemeToken();
  const skyStops = useSceneSkyColors();
  const themeHorizon = skyStops[skyStops.length - 1] ?? null;
  const background = resolveSurfaceBackground(
    useSettingsStore(selectSurfaceBackground),
    scheme,
    themeHorizon,
  );
  const framedSpaceRef = useRef<string | null>(null);
  const layout = useMemo(() => resolveSurfaceLayout(bounds), [bounds]);
  const focusWorld = useMemo(() => cellToWorld(layout.focusCell), [layout.focusCell]);
  const defaultDistance = useMemo(
    () => defaultCameraDistance(height, defaultVisibleRows(height)),
    [height],
  );
  useInitialFraming(spaceKey);
  useEffect(() => {
    setDefaultDistance(defaultDistance);
    setMapCenter({ x: focusWorld.x, y: 0, z: focusWorld.z }, layout.focusCell);
    const space = spaceKey ?? '__default__';
    const isEmpty = useSurfaceObjectsStore.getState().order.length === 0;
    if (framedSpaceRef.current !== space && isEmpty) {
      framedSpaceRef.current = space;
      setTarget({ x: focusWorld.x, y: 0, z: focusWorld.z });
    }
    logger.debug('scene.surface.layout', {
      bounds,
      defaultDistance,
      focusCell: layout.focusCell,
      reframed: framedSpaceRef.current === space,
    });
  }, [
    bounds,
    defaultDistance,
    focusWorld.x,
    focusWorld.z,
    layout.focusCell,
    logger,
    setDefaultDistance,
    setMapCenter,
    setTarget,
    spaceKey,
  ]);
  return (
    <SurfaceOrbitControls>
      <Canvas
        camera={{
          fov: cameraConfig.fov,
          near: cameraConfig.near,
          far: cameraConfig.far,
          position: [0, 4, 12],
        }}
        onCreated={({ gl }) => {
          patchExpoGlPixelStorei(gl.getContext());
        }}
        style={{ flex: 1, backgroundColor: background }}
      >
        <Scene />
      </Canvas>
    </SurfaceOrbitControls>
  );
}
export const SceneView = memo(SceneViewComponent);
