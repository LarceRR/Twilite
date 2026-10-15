import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isEnabled } from '@/app/config/featureFlags';

import {
  getFieldPerformanceSnapshot,
  type FieldPerformanceSnapshot,
} from './fieldPerformanceDiagnostics';

export function FieldPerformanceOverlay() {
  const enabled = isEnabled('scenePerformanceOverlay');
  const [snapshot, setSnapshot] = useState<FieldPerformanceSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => setSnapshot(getFieldPerformanceSnapshot()), 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled || snapshot === null) return null;

  return (
    <View pointerEvents="none" style={styles.panel}>
      <Text style={styles.text}>
        FPS {snapshot.fps.toFixed(0)} | frame avg/p95/max {snapshot.frameMsAverage.toFixed(1)}/{snapshot.frameMsP95.toFixed(1)}/{snapshot.frameMsMax.toFixed(1)} ms
      </Text>
      <Text style={styles.text}>
        CPU callbacks grid/objects {snapshot.gridCpuMs.toFixed(2)}/{snapshot.objectsCpuMs.toFixed(2)} ms
      </Text>
      <Text style={styles.text}>
        Draw calls {snapshot.drawCalls} | triangles {snapshot.triangles}
      </Text>
      <Text style={styles.text}>
        GPU resources geo/tex/programs {snapshot.geometries}/{snapshot.textures}/{snapshot.shaderPrograms} | queued uploads {snapshot.pendingGpuUploads}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    borderRadius: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 14,
    fontVariant: ['tabular-nums'],
  },
});
