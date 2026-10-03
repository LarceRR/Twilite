import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usesNativeTabBar } from '@/app/navigation/usesNativeTabBar';
import { layout, spacing } from '@/design-system/spacing/spacing';

import { FieldDevCameraHud } from './FieldDevCameraHud';
import { FieldDevCameraModeMenu, type FieldDevCameraMode } from './FieldDevCameraModeMenu';
import { FieldDevCameraMovePad } from './FieldDevCameraMovePad';
import { FieldDevCameraRotatePad } from './FieldDevCameraRotatePad';

function controlsBottomOffset(safeBottom: number): number {
  if (usesNativeTabBar()) {
    return safeBottom + spacing.sm + 52;
  }
  return safeBottom + layout.tabBarHeight + layout.tabBarInset + spacing.sm;
}

/** Developer camera HUD + move/rotate pads over the Field canvas. */
export function FieldDevCameraOverlay(): ReactElement {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<FieldDevCameraMode>('move');

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <FieldDevCameraHud />
      <FieldDevCameraModeMenu mode={mode} onModeChange={setMode} />
      <View
        pointerEvents="box-none"
        style={[styles.padWrap, { bottom: controlsBottomOffset(insets.bottom) }]}
      >
        {mode === 'move' ? <FieldDevCameraMovePad /> : <FieldDevCameraRotatePad />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  padWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: spacing.sm,
  },
});
