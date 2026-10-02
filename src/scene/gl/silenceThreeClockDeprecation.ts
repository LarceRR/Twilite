import { setConsoleFunction } from 'three';

/**
 * R3F v9 still constructs THREE.Clock; three >= r183 deprecates it in favor of
 * Timer. R3F v10 removes clock entirely — until we migrate, drop that one warn.
 */
export function silenceThreeClockDeprecation(): void {
  setConsoleFunction((type, message, ...params) => {
    if (
      type === 'warn' &&
      typeof message === 'string' &&
      message.includes('Clock: This module has been deprecated')
    ) {
      return;
    }

    if (type === 'error') {
      console.error(message, ...params);
      return;
    }
    if (type === 'warn') {
      console.warn(message, ...params);
      return;
    }
    console.log(message, ...params);
  });
}
