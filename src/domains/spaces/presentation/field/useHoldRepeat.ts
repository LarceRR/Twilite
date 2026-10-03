import { useRef } from 'react';

import { holdRepeatDelta } from './fieldCameraMotion';
import { getFieldConfig } from './fieldConfigStore';

type HoldHandlers = {
  readonly onPressIn: () => void;
  readonly onPressOut: () => void;
};

/** Fires `onStep(1)` immediately, then accelerates while held up to the motion cap. */
export function useHoldRepeat(onStep: (delta: number) => void): HoldHandlers {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const clear = (): void => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return {
    onPressIn: () => {
      clear();
      onStep(1);
      startedAtRef.current = Date.now();
      const { tickMs, startDelayMs } = getFieldConfig().holdRepeat;
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed < startDelayMs) return;
        onStep(holdRepeatDelta(elapsed - startDelayMs));
      }, tickMs);
    },
    onPressOut: clear,
  };
}
