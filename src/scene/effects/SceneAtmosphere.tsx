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

/**
 * Sky gradient backdrop + fog tinted to the horizon stop so fires fade into haze.
 */
export function SceneAtmosphere(): null {
  const scene = useThree((state) => state.scene);
  const skyStops = useSceneSkyColors();
  const surfaceOverride = useSettingsStore(selectSurfaceBackground);
  const textureRef = useRef<Texture | null>(null);

  useLayoutEffect(() => {
    const previous = textureRef.current;
    textureRef.current = null;

    if (previous !== null) {
      previous.dispose();
    }

    const horizon = surfaceOverride ?? horizonFromSky(skyStops);
    const fogColor = new Color(horizon);
    scene.fog = new Fog(fogColor, 1, 100);

    if (surfaceOverride !== null) {
      scene.background = fogColor.clone();
      return () => {
        scene.fog = null;
      };
    }

    const texture = createSkyBackgroundTexture(skyStops);
    if (texture === null) {
      scene.background = fogColor.clone();
      return () => {
        scene.fog = null;
      };
    }

    textureRef.current = texture;
    scene.background = texture;

    return () => {
      scene.fog = null;
      if (textureRef.current === texture) {
        texture.dispose();
        textureRef.current = null;
      }
    };
  }, [scene, skyStops, surfaceOverride]);

  useFrame(() => {
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
