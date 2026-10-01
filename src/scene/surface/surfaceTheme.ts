/**
 * Цвета самой поверхности.
 *
 * Фон настраивается пользователем (Настройки → Внешний вид) либо следует за
 * темой. Всё, что красит поверхность — clear-color, `scene.background`, туман,
 * шейдер грида и подложка Canvas — берёт его отсюда, а не из константы.
 */

export type SurfaceScheme = 'light' | 'dark';

export const LIGHT_SURFACE_BACKGROUND = '#F7F4ED';
export const DARK_SURFACE_BACKGROUND = '#121017';
export const DEFAULT_SURFACE_BACKGROUND = LIGHT_SURFACE_BACKGROUND;

/** null in settings means follow the active theme sky horizon (or scheme default). */
export function resolveSurfaceBackground(
  value: string | null,
  scheme: SurfaceScheme,
  themeHorizon: string | null = null,
): string {
  if (value !== null) return value;
  if (themeHorizon !== null) return themeHorizon;
  return scheme === 'dark' ? DARK_SURFACE_BACKGROUND : LIGHT_SURFACE_BACKGROUND;
}

/** Only surfaces with the active scheme's luminance are offered in settings. */
export function surfaceOptionsForScheme(scheme: SurfaceScheme): readonly string[] {
  return SURFACE_BACKGROUND_OPTIONS.filter((color) =>
    scheme === 'dark' ? !isLightSurface(color) : isLightSurface(color),
  );
}

export const SURFACE_BACKGROUND_OPTIONS: readonly string[] = [
  '#FDFBF7',
  '#F7F4ED',
  '#EFE9DA',
  '#E3E7EA',
  '#C6CDD6',
  '#7C8796',
  '#3A3644',
  '#272231',
  '#18151E',
  '#0C0A0E',
];

type Rgb = { readonly r: number; readonly g: number; readonly b: number };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

function channel(source: string, from: number): number {
  const value = Number.parseInt(source.slice(from, from + 2), 16);
  return Number.isNaN(value) ? 0 : value;
}

function parseHex(hex: string): Rgb {
  const normalized = hex.trim().replace('#', '');
  const expanded =
    normalized.length === 3 ? [...normalized].map((s) => `${s}${s}`).join('') : normalized;
  return { r: channel(expanded, 0), g: channel(expanded, 2), b: channel(expanded, 4) };
}

function toHex(rgb: Rgb): string {
  const part = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`;
}

function mix(color: Rgb, target: Rgb, amount: number): Rgb {
  return {
    r: color.r + (target.r - color.r) * amount,
    g: color.g + (target.g - color.g) * amount,
    b: color.b + (target.b - color.b) * amount,
  };
}

export function surfaceLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function isLightSurface(background: string): boolean {
  return surfaceLuminance(background) > 0.5;
}

export function gridColorFor(background: string): string {
  const rgb = parseHex(background);
  const light = isLightSurface(background);
  return toHex(mix(rgb, light ? BLACK : WHITE, light ? 0.04 : 0.07));
}
