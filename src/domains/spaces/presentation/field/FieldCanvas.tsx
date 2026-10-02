import { Canvas } from '@react-three/fiber/native';
import { memo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import { FIELD_CAMERA } from './fieldCamera';
import { FieldScene } from './FieldScene';

type FieldCanvasProps = {
  readonly maxRow: number;
};

function FieldCanvasComponent({ maxRow }: FieldCanvasProps): ReactElement {
  const { position, lookAt, fov, near, far } = FIELD_CAMERA;
  // Static camera + static bridge: render on demand. The perf overlay needs a
  // running loop to measure anything, so it opts back into `always`.
  const measureFps = useSettingsStore((state) => state.showPerformanceOverlay);
  return (
    <View style={styles.root} pointerEvents="none">
      <Canvas
        frameloop={measureFps ? 'always' : 'demand'}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        camera={{
          position: [position.x, position.y, position.z],
          fov,
          near,
          far,
        }}
        onCreated={({ camera, gl, invalidate }) => {
          camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
          gl.setClearColor(0x000000, 0);
          invalidate();
        }}
        style={styles.canvas}
      >
        <FieldScene maxRow={maxRow} />
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
