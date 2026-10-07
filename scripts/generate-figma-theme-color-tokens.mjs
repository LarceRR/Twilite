/**
 * Emits Figma DTCG color tokens whose names match app theme variables
 * (`THEME_COLOR_KEYS` / `ThemeColors`). Values = built-in dark theme.
 *
 * Official import: https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Must stay in sync with `THEME_COLOR_KEYS` + `darkTheme`. */
const darkThemeColors = {
  surface: '#121017',
  surfaceRaised: '#1F1B26',
  surfaceSunken: '#0C0A0E',
  surfaceDivider: 'rgba(253, 251, 247, 0.1)',
  surfaceOverlay: 'rgba(24, 21, 30, 0.78)',
  textPrimary: '#F7F4ED',
  textSecondary: '#C2BCC9',
  textTertiary: '#9A93A3',
  textInverted: '#0C0A0E',
  accent: '#F08C34',
  accentSoft: 'rgba(251, 178, 104, 0.18)',
  accentPressed: '#FBB268',
  accentOn: '#0C0A0E',
  secondary: '#C795B4',
  secondarySoft: 'rgba(199, 149, 180, 0.18)',
  tertiary: '#8CC5B9',
  tertiarySoft: 'rgba(140, 197, 185, 0.16)',
  positive: '#7FB489',
  negative: '#E0736C',
  warning: '#E5AE5A',
  glassTint: 'rgba(24, 21, 30, 0.55)',
  glassRim: 'rgba(253, 251, 247, 0.14)',
  glassRimAndroid: 'rgba(253, 251, 247, 0.1)',
  glassFillAndroid: 'rgba(31, 27, 38, 0.88)',
  controlActive: '#F7F4ED',
  controlInactive: 'rgba(247, 244, 237, 0.38)',
  controlTrack: '#272231',
  scrim: 'rgba(12, 10, 14, 0.62)',
  skeleton: 'rgba(253, 251, 247, 0.08)',
  focusRing: 'rgba(251, 178, 104, 0.6)',
};

/** Dark pack sky stops from `DARK_THEME_PACK.sceneBackgroundColors`. */
const sceneBackgroundColors = ['#070B18', '#10131F', '#1A1720'];

function parseCssColor(value) {
  const hex = value.match(/^#([0-9A-Fa-f]{6})$/);
  if (hex) {
    const n = hex[1];
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
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: Number(rgba[4]),
    };
  }

  throw new Error(`Unsupported color: ${value}`);
}

function toColorToken(css) {
  const { r, g, b, a } = parseCssColor(css);
  const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

  return {
    $type: 'color',
    $value: {
      colorSpace: 'srgb',
      components: [r / 255, g / 255, b / 255],
      alpha: a,
      hex,
    },
  };
}

const tokens = {};
for (const [key, value] of Object.entries(darkThemeColors)) {
  tokens[key] = toColorToken(value);
}

tokens.sceneBackgroundColors = Object.fromEntries(
  sceneBackgroundColors.map((hex, index) => [String(index), toColorToken(hex)]),
);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'design', 'figma', 'twilite-theme-colors.tokens.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(tokens, null, 2)}\n`);

console.log(
  `Wrote ${outPath} (${Object.keys(darkThemeColors).length} ThemeColors + ${sceneBackgroundColors.length} sky stops)`,
);
