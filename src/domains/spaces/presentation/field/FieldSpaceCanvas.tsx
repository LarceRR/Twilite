import { Canvas } from '@react-three/fiber/native';
import { useIsFocused } from 'expo-router';
import { AppState, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import { useSceneColors } from '@/design-system/colors/colors';
import type { SurfaceObject } from '@/domains/spaces/domain/entities/SurfaceObject';
import { FieldCameraSwipeControls } from './FieldCameraSwipeControls';
import { requeueFieldChunkGpuUploadsAfterContextRestore } from './fieldGridChunkBake';
import { FieldPerformanceOverlay } from './FieldPerformanceOverlay';
import { FieldSpaceCamera } from './FieldSpaceCamera';
import { FieldSpaceScene } from './FieldSpaceScene';
import { fieldCameraOpticsFromConfig } from './fieldCameraFraming';
import { getFieldConfig } from './fieldConfigStore';
import { getFieldPerformanceSnapshot } from './fieldPerformanceDiagnostics';

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
  const fov = getFieldConfig().camera.fov;
  // Read the initial camera setup without subscribing the Canvas root to every
  // developer-config update. FieldSpaceCamera applies camera edits imperatively.
  const camera = useMemo(
    () => ({
      position: [pose.position.x, pose.position.y, pose.position.z] as [number, number, number],
      rotation: [
        (pose.rotationDeg.x * Math.PI) / 180,
        (pose.rotationDeg.y * Math.PI) / 180,
        (pose.rotationDeg.z * Math.PI) / 180,
      ] as [number, number, number],
      up: [0, 0, 1] as [number, number, number],
      fov,
      near: pose.near,
      far: pose.far,
    }),
    [
      pose.position.x,
      pose.position.y,
      pose.position.z,
      pose.rotationDeg.x,
      pose.rotationDeg.y,
      pose.rotationDeg.z,
      pose.near,
      pose.far,
      fov,
    ],
  );
  const gl = useMemo(() => ({ antialias: true }), []);
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const previousFocusRef = useRef(isFocused);
  const appStateRef = useRef(AppState.currentState);
  const recoveryPendingRef = useRef(false);
  const [canvasEpoch, setCanvasEpoch] = useState(0);

  const lastCanvasRecoveryAtRef = useRef(0);
  const recoverCanvas = useCallback(() => {
    if (!recoveryPendingRef.current) return;
    recoveryPendingRef.current = false;
    lastCanvasRecoveryAtRef.current = Date.now();
    requeueFieldChunkGpuUploadsAfterContextRestore();
    setCanvasEpoch((current) => current + 1);
  }, []);

  // Some GL stalls happen without a route/AppState transition (for example
  // after a long idle). If the R3F frame monitor stops publishing while this
  // scene is still active, recreate the canvas once and re-upload its textures.
  useEffect(() => {
    if (!isFocused) return;

    const watchdog = setInterval(() => {
      if (AppState.currentState !== 'active' || !isFocusedRef.current) return;
      const snapshot = getFieldPerformanceSnapshot();
      if (snapshot === null) return;

      const now = Date.now();
      const staleForMs = now - snapshot.sampledAtMs;
      const sinceRecoveryMs = now - lastCanvasRecoveryAtRef.current;
      if (staleForMs < 12_000 || sinceRecoveryMs < 30_000) return;

      recoveryPendingRef.current = true;
      recoverCanvas();
    }, 3_000);

    return () => clearInterval(watchdog);
  }, [isFocused, recoverCanvas]);

  useEffect(() => {
    if (!isFocused) {
      recoveryPendingRef.current = true;
    } else if (!previousFocusRef.current && recoveryPendingRef.current) {
      recoverCanvas();
    }
    previousFocusRef.current = isFocused;
  }, [isFocused, recoverCanvas]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState !== 'active') {
        if (previousState === 'active') recoveryPendingRef.current = true;
        return;
      }

      // Ignore the initial unknown/null -> active notification.
      if (previousState !== 'active' && previousState !== null && previousState !== 'unknown') {
        recoveryPendingRef.current = true;
      }
      if (recoveryPendingRef.current && isFocusedRef.current) recoverCanvas();
    });

    return () => subscription.remove();
  }, [recoverCanvas]);

  return (
    <View style={[styles.root, { backgroundColor: scene.background }]}>
      <FieldCameraSwipeControls>
        <Canvas
          key={canvasEpoch}
          style={styles.canvas}
          camera={camera}
          gl={gl}
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
