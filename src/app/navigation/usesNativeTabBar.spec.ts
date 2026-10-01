import { describe, expect, it } from 'vitest';
import { Platform } from 'react-native';

import { usesNativeTabBar } from './usesNativeTabBar';

describe('usesNativeTabBar', () => {
  it('uses the system tab bar only on iOS', () => {
    expect(usesNativeTabBar()).toBe(Platform.OS === 'ios');
  });
});
