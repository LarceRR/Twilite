import { useFrame, useThree } from '@react-three/fiber/native';
import { useLayoutEffect, useRef } from 'react';
import { Color, Fog, type Texture } from 'three';

import { useSceneSkyColors } from '@/design-system/colors/colors';
import { cameraMotion } from '@/design-system/motion/camera';
import {
  selectSurfaceBackground,
  useSettingsStore,
} from '@/domains/settings/presentation/stores/settingsStore';
import { useCameraStore } from '@/scene/stores/cameraStore';
import { fogDistanceBounds } from '@/scene/surface/surfaceGridMaterial';

import { createSkyBackgroundTexture } from './createSkyBackgroundTexture';

function horizonFromSky(stops: readonly string[]): string {
  return stops[stops.length - 1] ?? '#808080';
}

export type SceneAtmosphereProps = {
  /**
   * Static scenes (the field) pass their own fog. Without it, fog follows the
   * orbit camera distance every frame.
   */
  readonly fixedFog?: { readonly near: number; readonly far: number };
};

/**
 * Sky gradient backdrop + fog tinted to the horizon stop so fires fade into haze.
 */
export function SceneAtmosphere({ fixedFog }: SceneAtmosphereProps = {}): null {
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const skyStops = useSceneSkyColors();
  const surfaceOverride = useSettingsStore(selectSurfaceBackground);
  const textureRef = useRef<Texture | null>(null);
  const fixedNear = fixedFog?.near;
  const fixedFar = fixedFog?.far;

  useLayoutEffect(() => {
    const previous = textureRef.current;
    textureRef.current = null;

    if (previous !== null) {
      previous.dispose();
    }

    const horizon = surfaceOverride ?? horizonFromSky(skyStops);
    const fogColor = new Color(horizon);
    scene.fog = new Fog(fogColor, fixedNear ?? 1, fixedFar ?? 100);

    const texture = surfaceOverride !== null ? null : createSkyBackgroundTexture(skyStops);
    scene.background = texture ?? fogColor.clone();
    textureRef.current = texture;
    // Imperative scene changes don't schedule a frame under frameloop="demand".
    invalidate();

    return () => {
      scene.fog = null;
      if (texture !== null && textureRef.current === texture) {
        texture.dispose();
        textureRef.current = null;
      }
    };
  }, [fixedFar, fixedNear, invalidate, scene, skyStops, surfaceOverride]);

  useFrame(() => {
    if (fixedNear !== undefined && fixedFar !== undefined) {
      return;
    }

    const fog = scene.fog;

    if (!(fog instanceof Fog)) {
      return;
    }

    const { distance } = useCameraStore.getState().orbit;
    const bounds = fogDistanceBounds(
      distance,
      cameraMotion.fogNearFactor,
      cameraMotion.fogFarFactor,
    );
    fog.near = bounds.near;
    fog.far = bounds.far;
  });

  return null;
}
