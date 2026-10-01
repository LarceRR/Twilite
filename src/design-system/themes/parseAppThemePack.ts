import type { ThemeColors } from '../colors/themes';
import { isCssColor, isOpaqueHexColor } from './isCssColor';
import { MAX_SKY_STOPS, MIN_SKY_STOPS, THEME_COLOR_KEYS } from './themeColorKeys';
import type { AppThemePack, AppThemePackInput } from './types';

export type ParseThemePackResult =
  | { readonly ok: true; readonly pack: AppThemePack }
  | { readonly ok: false; readonly error: string };

function asNonEmptyString(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  void field;
  return value.trim();
}

function parseColors(raw: unknown): ThemeColors | string {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return 'colors must be an object';
  }

  const record = raw as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== THEME_COLOR_KEYS.length) {
    return `colors must have exactly ${THEME_COLOR_KEYS.length} keys`;
  }

  const colors = {} as Record<string, string>;
  for (const key of THEME_COLOR_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || !isCssColor(value)) {
      return `colors.${key} must be a valid CSS color`;
    }
    colors[key] = value.trim();
  }

  for (const key of keys) {
    if (!(THEME_COLOR_KEYS as readonly string[]).includes(key)) {
      return `unknown colors key: ${key}`;
    }
  }

  return colors as ThemeColors;
}

function parseSky(raw: unknown): readonly string[] | string {
  if (!Array.isArray(raw)) {
    return 'sceneBackgroundColors must be an array';
  }
  if (raw.length < MIN_SKY_STOPS || raw.length > MAX_SKY_STOPS) {
    return `sceneBackgroundColors length must be ${MIN_SKY_STOPS}–${MAX_SKY_STOPS}`;
  }

  const stops: string[] = [];
  for (const [index, value] of raw.entries()) {
    if (typeof value !== 'string' || !isOpaqueHexColor(value)) {
      return `sceneBackgroundColors[${index}] must be #RRGGBB`;
    }
    stops.push(value.trim().toUpperCase());
  }

  return stops;
}

/** Validates and normalizes a theme pack from JSON / API / AI output. */
export function parseAppThemePack(input: AppThemePackInput): ParseThemePackResult {
  const id = asNonEmptyString(input.id, 'id');
  if (id === null) {
    return { ok: false, error: 'id is required' };
  }

  const name = asNonEmptyString(input.name, 'name');
  if (name === null) {
    return { ok: false, error: 'name is required' };
  }

  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const authorDisplayName = asNonEmptyString(input.authorDisplayName, 'authorDisplayName');
  if (authorDisplayName === null) {
    return { ok: false, error: 'authorDisplayName is required' };
  }

  const createdAt = asNonEmptyString(input.createdAt, 'createdAt');
  if (createdAt === null) {
    return { ok: false, error: 'createdAt is required' };
  }

  const colors = parseColors(input.colors);
  if (typeof colors === 'string') {
    return { ok: false, error: colors };
  }

  const sky = parseSky(input.sceneBackgroundColors);
  if (typeof sky === 'string') {
    return { ok: false, error: sky };
  }

  return {
    ok: true,
    pack: {
      id,
      name,
      description,
      authorDisplayName,
      createdAt,
      colors,
      sceneBackgroundColors: sky,
    },
  };
}
