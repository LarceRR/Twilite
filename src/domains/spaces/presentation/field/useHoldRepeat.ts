import { useRef } from 'react';

import { holdRepeatDelta } from './fieldCameraMotion';

const TICK_MS = 50;
const HOLD_START_DELAY_MS = 180;

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
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed < HOLD_START_DELAY_MS) return;
        onStep(holdRepeatDelta(elapsed - HOLD_START_DELAY_MS));
      }, TICK_MS);
    },
    onPressOut: clear,
  };
}
