import { describe, expect, it } from 'vitest';

import { darkTheme, lightTheme } from '@/design-system/colors/colors';

import { createNavigationTheme } from './createNavigationTheme';

describe('createNavigationTheme', () => {
  it('uses surface as navigation background for light and dark packs', () => {
    const light = createNavigationTheme(lightTheme, false);
    expect(light.dark).toBe(false);
    expect(light.colors.background).toBe(lightTheme.surface);
    expect(light.colors.primary).toBe(lightTheme.accent);

    const dark = createNavigationTheme(darkTheme, true);
    expect(dark.dark).toBe(true);
    expect(dark.colors.background).toBe(darkTheme.surface);
    expect(dark.colors.card).toBe(darkTheme.surfaceRaised);
  });
});
