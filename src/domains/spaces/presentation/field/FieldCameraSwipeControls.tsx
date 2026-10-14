import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { beginCameraSwipe, finishCameraSwipe, updateCameraSwipe } from './fieldCameraSwipeMotion';

const SWIPE_ACTIVATION_THRESHOLD_PX = 8;
const HORIZONTAL_SWIPE_TOLERANCE_PX = 24;

export function FieldCameraSwipeControls({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetY([-SWIPE_ACTIVATION_THRESHOLD_PX, SWIPE_ACTIVATION_THRESHOLD_PX])
    .failOffsetX([-HORIZONTAL_SWIPE_TOLERANCE_PX, HORIZONTAL_SWIPE_TOLERANCE_PX])
    .runOnJS(true)
    .onStart(beginCameraSwipe)
    .onChange(({ changeY, velocityY }) => updateCameraSwipe(changeY, velocityY))
    .onEnd(({ velocityY }) => finishCameraSwipe(velocityY))
    .onFinalize(() => finishCameraSwipe());

  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false} style={styles.fill}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
