import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { darkTheme } from '../colors/themes';
import { DARK_THEME_PACK } from './builtinPacks';
import { THEME_COLOR_KEYS } from './themeColorKeys';

type DtcgColorToken = {
  readonly $type: 'color';
  readonly $value: {
    readonly colorSpace: 'srgb';
    readonly components: readonly [number, number, number];
    readonly alpha: number;
    readonly hex: string;
  };
};

function isColorToken(value: unknown): value is DtcgColorToken {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.$type !== 'color') return false;
  const tokenValue = record.$value;
  if (tokenValue === null || typeof tokenValue !== 'object') return false;
  const color = tokenValue as Record<string, unknown>;
  return (
    color.colorSpace === 'srgb' &&
    Array.isArray(color.components) &&
    color.components.length === 3 &&
    typeof color.alpha === 'number' &&
    typeof color.hex === 'string'
  );
}

function parseCssColor(value: string): { r: number; g: number; b: number; a: number } {
  const hex = value.match(/^#([0-9A-Fa-f]{6})$/);
  const n = hex?.[1];
  if (n !== undefined) {
    return {
      r: Number.parseInt(n.slice(0, 2), 16),
      g: Number.parseInt(n.slice(2, 4), 16),
      b: Number.parseInt(n.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgba = value.match(
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+|1\.0+)\s*\)$/,
  );
  if (!rgba) {
    throw new Error(`Unsupported color: ${value}`);
  }

  return {
    r: Number(rgba[1]),
    g: Number(rgba[2]),
    b: Number(rgba[3]),
    a: Number(rgba[4]),
  };
}

describe('figma twilite-theme-colors.tokens.json', () => {
  const path = join(process.cwd(), 'design', 'figma', 'twilite-theme-colors.tokens.json');
  const tokens = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

  it('uses exact ThemeColors / THEME_COLOR_KEYS names', () => {
    for (const key of THEME_COLOR_KEYS) {
      expect(isColorToken(tokens[key]), key).toBe(true);
    }
  });

  it('matches darkTheme CSS values', () => {
    for (const key of THEME_COLOR_KEYS) {
      const token = tokens[key] as DtcgColorToken;
      const expected = parseCssColor(darkTheme[key]);
      expect(token.$value.hex).toBe(
        `#${[expected.r, expected.g, expected.b]
          .map((c) => c.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()}`,
      );
      expect(token.$value.alpha).toBeCloseTo(expected.a, 5);
    }
  });

  it('includes dark sky stops under sceneBackgroundColors', () => {
    const sky = tokens.sceneBackgroundColors as Record<string, unknown>;
    expect(Object.keys(sky)).toEqual(
      DARK_THEME_PACK.sceneBackgroundColors.map((_, index) => String(index)),
    );
    for (const [index, hex] of DARK_THEME_PACK.sceneBackgroundColors.entries()) {
      const token = sky[String(index)] as DtcgColorToken;
      expect(token.$value.hex).toBe(hex.toUpperCase());
      expect(token.$value.alpha).toBe(1);
    }
  });
});
