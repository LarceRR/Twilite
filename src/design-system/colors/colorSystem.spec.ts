import { describe, expect, it } from 'vitest';

import { alpha, colorRamps, palette, withAlpha } from './palette';
import { darkScene, darkTheme, lightScene, lightTheme, type ThemeColors } from './themes';
import { resolveActivePack, resolveScheme } from './themeStore';
import { DARK_THEME_PACK, LIGHT_THEME_PACK } from '../themes';

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Relative luminance, 0 (black) … 1 (white). */
function luminance(value: string): number {
  const hex = value.replace('#', '');
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

describe('palette', () => {
  it('avoids pure white and pure black as product surfaces', () => {
    expect(palette.paper000).not.toBe('#FFFFFF');
    expect(palette.basalt900).not.toBe('#000000');
  });

  it('keeps the legacy names resolvable', () => {
    expect(colorRamps.stone050).toBe(palette.paper050);
    expect(colorRamps.crimson500).toBe(palette.madder500);
  });

  it('emits rgba strings from withAlpha', () => {
    expect(withAlpha('#FF8A1F', alpha.medium)).toBe('rgba(255, 138, 31, 0.45)');
  });
});

describe('themes', () => {
  const keys = Object.keys(lightTheme) as readonly (keyof ThemeColors)[];

  it('defines the same token set in both schemes', () => {
    expect(Object.keys(darkTheme).sort()).toEqual([...keys].sort());
  });

  it('flips surface and text lightness between schemes', () => {
    expect(luminance(lightTheme.surface)).toBeGreaterThan(0.8);
    expect(luminance(darkTheme.surface)).toBeLessThan(0.15);
    expect(luminance(lightTheme.textPrimary)).toBeLessThan(0.2);
    expect(luminance(darkTheme.textPrimary)).toBeGreaterThan(0.85);
  });

  it('raises surfaces toward the viewer in dark mode', () => {
    expect(luminance(darkTheme.surfaceRaised)).toBeGreaterThan(luminance(darkTheme.surface));
    expect(luminance(darkTheme.surfaceSunken)).toBeLessThan(luminance(darkTheme.surface));
  });

  it('brightens the accent on dark so it does not read muddy', () => {
    expect(luminance(darkTheme.accent)).toBeGreaterThan(luminance(lightTheme.accent));
  });

  it('keeps the flame identical across schemes', () => {
    expect(darkScene.fireShell).toBe(lightScene.fireShell);
    expect(darkScene.fireEmissive).toBe(lightScene.fireEmissive);
  });

  it('keeps the surface grid close to its own background', () => {
    expect(
      Math.abs(luminance(lightScene.surfaceGrid) - luminance(lightScene.background)),
    ).toBeLessThan(0.06);
    expect(
      Math.abs(luminance(darkScene.surfaceGrid) - luminance(darkScene.background)),
    ).toBeLessThan(0.06);
  });

  it('only ships parseable hex in the scene palettes', () => {
    for (const value of Object.values(lightScene)) {
      expect(value).toMatch(HEX);
    }
  });
});

describe('resolveScheme', () => {
  it('follows the OS only in system mode', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});

describe('resolveActivePack', () => {
  it('uses builtins from mode when no override', () => {
    expect(resolveActivePack('light', 'dark', null).id).toBe('light');
    expect(resolveActivePack('system', 'dark', null).id).toBe('dark');
  });

  it('prefers catalog override over mode', () => {
    expect(resolveActivePack('light', 'light', DARK_THEME_PACK).id).toBe('dark');
    expect(resolveActivePack('dark', 'dark', LIGHT_THEME_PACK).id).toBe('light');
  });
});
