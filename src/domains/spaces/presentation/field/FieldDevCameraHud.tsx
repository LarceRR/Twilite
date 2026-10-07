import { useEffect, useState, type ReactElement } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/design-system/colors/colors';
import { GlassSurface } from '@/design-system/components/GlassSurface/GlassSurface';
import { radius } from '@/design-system/radius/radius';
import { spacing } from '@/design-system/spacing/spacing';

import { useFieldCameraControlStore } from './fieldCameraControlStore';
import {
  CAMERA_HUD_PUBLISH_MS,
  formatCameraHud,
  shouldPublishThrottled,
} from './fieldCameraMotion';

function hudTextFromStore(): string {
  const s = useFieldCameraControlStore.getState();
  return formatCameraHud({
    position: s.position,
    rotationDeg: s.rotationDeg,
    fov: s.fov,
    near: s.near,
    far: s.far,
  });
}

/** Throttled pose readout — continuous store updates must not re-render Glass every tick. */
export function FieldDevCameraHud(): ReactElement | null {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const ready = useFieldCameraControlStore((s) => s.ready);
  const [text, setText] = useState(hudTextFromStore);

  useEffect(() => {
    let lastPublishMs = 0;
    return useFieldCameraControlStore.subscribe(() => {
      const now = Date.now();
      if (!shouldPublishThrottled(now, lastPublishMs, CAMERA_HUD_PUBLISH_MS)) return;
      lastPublishMs = now;
      setText(hudTextFromStore());
    });
  }, []);

  if (!ready) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.sm, left: spacing.sm }]}>
      <GlassSurface cornerRadius={radius.md} style={styles.surface}>
        <Text style={[styles.text, { color: theme.textPrimary }]}>{text}</Text>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 20,
    maxWidth: 180,
  },
  surface: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 15,
  },
});
