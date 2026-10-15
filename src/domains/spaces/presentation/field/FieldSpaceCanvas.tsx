import { Canvas } from '@react-three/fiber/native';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import { useSceneColors } from '@/design-system/colors/colors';
import type { SurfaceObject } from '@/domains/spaces/domain/entities/SurfaceObject';
import { FieldCameraSwipeControls } from './FieldCameraSwipeControls';
import { FieldPerformanceOverlay } from './FieldPerformanceOverlay';
import { FieldSpaceCamera } from './FieldSpaceCamera';
import { FieldSpaceScene } from './FieldSpaceScene';
import { fieldCameraOpticsFromConfig } from './fieldCameraFraming';
import { useFieldConfig } from './useFieldConfig';

/**
 * Expo / R3F native canvas for the Field tab.
 * Imports from `@react-three/fiber/native` (expo-gl under the hood).
 */
export function FieldSpaceCanvas({
  objects,
  headers,
}: {
  readonly objects: readonly SurfaceObject[];
  readonly headers: AuthenticatedAssetHeaders;
}): ReactElement {
  const scene = useSceneColors();
  const pose = fieldCameraOpticsFromConfig();
  const fov = useFieldConfig().camera.fov;

  return (
    <View style={[styles.root, { backgroundColor: scene.background }]}>
      <FieldCameraSwipeControls>
        <Canvas
          style={styles.canvas}
          camera={{
            position: [pose.position.x, pose.position.y, pose.position.z],
            rotation: [
              (pose.rotationDeg.x * Math.PI) / 180,
              (pose.rotationDeg.y * Math.PI) / 180,
              (pose.rotationDeg.z * Math.PI) / 180,
            ],
            up: [0, 0, 1],
            fov,
            near: pose.near,
            far: pose.far,
          }}
          gl={{ antialias: true }}
          // Tiles and pixel-art are authored as final display colors: keep sRGB
          // output but skip filmic tone mapping, which washes out the palette.
          flat
          shadows="percentage"
        >
          <color attach="background" args={[scene.background]} />
          <FieldSpaceCamera />
          <FieldSpaceScene headers={headers} objects={objects} />
        </Canvas>
      </FieldCameraSwipeControls>
      <FieldPerformanceOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvas: { flex: 1 },
});
