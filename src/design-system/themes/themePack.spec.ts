import { describe, expect, it } from 'vitest';

import { darkTheme, lightTheme, type ThemeColors } from '../colors/themes';
import { BUILTIN_THEME_PACKS, DARK_THEME_PACK, LIGHT_THEME_PACK } from './builtinPacks';
import { buildSkyGradientPixels } from './buildSkyGradientPixels';
import { isCssColor, isOpaqueHexColor } from './isCssColor';
import { isDarkPack, skyHorizonColor } from './isDarkPack';
import { parseAppThemePack } from './parseAppThemePack';
import { THEME_COLOR_KEYS } from './themeColorKeys';
import { TOKEN_META } from './tokenMeta';

describe('isCssColor', () => {
  it('accepts hex and rgba used by ThemeColors', () => {
    expect(isCssColor('#F7F4ED')).toBe(true);
    expect(isCssColor('rgba(255, 138, 31, 0.45)')).toBe(true);
    expect(isCssColor('not-a-color')).toBe(false);
  });

  it('requires opaque hex for sky stops', () => {
    expect(isOpaqueHexColor('#8EB7E8')).toBe(true);
    expect(isOpaqueHexColor('#8EB7E880')).toBe(false);
  });
});

describe('parseAppThemePack', () => {
  it('accepts builtin light pack shape', () => {
    const result = parseAppThemePack(LIGHT_THEME_PACK);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.id).toBe('light');
      expect(result.pack.sceneBackgroundColors).toHaveLength(3);
    }
  });

  it('rejects missing color keys', () => {
    const { surface: _surface, ...rest } = lightTheme;
    void _surface;
    const result = parseAppThemePack({
      ...LIGHT_THEME_PACK,
      colors: rest,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects sky with one stop', () => {
    const result = parseAppThemePack({
      ...LIGHT_THEME_PACK,
      sceneBackgroundColors: ['#8EB7E8'],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects sky with six stops', () => {
    const result = parseAppThemePack({
      ...LIGHT_THEME_PACK,
      sceneBackgroundColors: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'],
    });
    expect(result.ok).toBe(false);
  });
});

describe('token meta', () => {
  it('covers every ThemeColors key plus sky', () => {
    const keys = TOKEN_META.map((entry) => entry.key);
    for (const key of THEME_COLOR_KEYS) {
      expect(keys).toContain(key);
    }
    expect(keys).toContain('sceneBackgroundColors');
  });

  it('matches ThemeColors key set exactly', () => {
    expect([...THEME_COLOR_KEYS].sort()).toEqual(
      (Object.keys(lightTheme) as (keyof ThemeColors)[]).slice().sort(),
    );
    expect(Object.keys(darkTheme).sort()).toEqual([...THEME_COLOR_KEYS].sort());
  });
});

describe('isDarkPack', () => {
  it('classifies builtins', () => {
    expect(isDarkPack(LIGHT_THEME_PACK)).toBe(false);
    expect(isDarkPack(DARK_THEME_PACK)).toBe(true);
  });

  it('returns horizon as last sky stop', () => {
    expect(skyHorizonColor(LIGHT_THEME_PACK)).toBe('#F7F4ED');
  });
});

describe('buildSkyGradientPixels', () => {
  it('puts top and bottom stops at the edges', () => {
    const pixels = buildSkyGradientPixels(['#FF0000', '#0000FF'], 1, 2);
    expect(pixels).not.toBeNull();
    expect(Array.from(pixels!.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(pixels!.slice(4, 8))).toEqual([0, 0, 255, 255]);
  });

  it('returns null for invalid input', () => {
    expect(buildSkyGradientPixels(['#FF0000'], 4, 4)).toBeNull();
    expect(buildSkyGradientPixels(['nope', '#0000FF'], 4, 4)).toBeNull();
  });
});

describe('builtin packs', () => {
  it('parse cleanly', () => {
    for (const pack of BUILTIN_THEME_PACKS) {
      expect(parseAppThemePack(pack).ok).toBe(true);
    }
  });
});
