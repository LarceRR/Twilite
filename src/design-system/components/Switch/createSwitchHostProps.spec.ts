import { describe, expect, it } from 'vitest';

import { createSwitchHostProps } from './createSwitchHostProps';

describe('createSwitchHostProps', () => {
  it('uses the brand accent as the native seed color', () => {
    expect(
      createSwitchHostProps({ accent: '#E85D04', isDark: false }),
    ).toEqual({
      seedColor: '#E85D04',
      colorScheme: 'light',
    });
  });

  it('forces dark scheme when the active pack is dark', () => {
    expect(
      createSwitchHostProps({ accent: '#FF8A4C', isDark: true }),
    ).toEqual({
      seedColor: '#FF8A4C',
      colorScheme: 'dark',
    });
  });
});
