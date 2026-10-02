import { Canvas } from '@react-three/fiber/native';
import { memo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { patchExpoGlPixelStorei } from '@/scene/gl/patchExpoGlPixelStorei';

import { FIELD_CAMERA } from './fieldCameraDefaults';
import type { FieldSpritePlacement } from './FieldObjectLayer';
import { FieldScene } from './FieldScene';

type FieldCanvasProps = {
  readonly maxRow: number;
  readonly sprites: readonly FieldSpritePlacement[];
};

function FieldCanvasComponent({ maxRow, sprites }: FieldCanvasProps): ReactElement {
  const { position, lookAt, fov, near, far } = FIELD_CAMERA;
  return (
    <View style={styles.root} pointerEvents="none">
      <Canvas
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        camera={{
          position: [position.x, position.y, position.z],
          fov,
          near,
          far,
        }}
        onCreated={({ camera, gl }) => {
          patchExpoGlPixelStorei(gl.getContext());
          camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
          gl.setClearColor(0x000000, 0);
        }}
        style={styles.canvas}
      >
        <FieldScene maxRow={maxRow} sprites={sprites} />
      </Canvas>
    </View>
  );
}

export const FieldCanvas = memo(FieldCanvasComponent);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
