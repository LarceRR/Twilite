import { Canvas } from '@react-three/fiber/native';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSceneColors } from '@/design-system/colors/colors';

import { fieldCameraOpticsFromConfig } from './fieldCameraFraming';
import { FieldSpaceCamera } from './FieldSpaceCamera';
import { FieldSpaceScene } from './FieldSpaceScene';
import { useFieldConfig } from './useFieldConfig';

/**
 * Expo / R3F native canvas for the Field tab.
 * Imports from `@react-three/fiber/native` (expo-gl under the hood).
 */
export function FieldSpaceCanvas(): ReactElement {
  const scene = useSceneColors();
  const pose = fieldCameraOpticsFromConfig();
  const fov = useFieldConfig().camera.fov;

  return (
    <View style={[styles.root, { backgroundColor: scene.background }]}>
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
      >
        <color attach="background" args={[scene.background]} />
        <FieldSpaceCamera />
        <FieldSpaceScene />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvas: { flex: 1 },
});
