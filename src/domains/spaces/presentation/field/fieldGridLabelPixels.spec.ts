import { describe, expect, it } from 'vitest';

import { currentThemeColors } from '@/design-system/colors/colors';

import {
  FIELD_ACTIVE_CENTER_RGBA,
  FIELD_ACTIVE_FILL_HEX,
  FIELD_ACTIVE_FILL_RGBA,
  compositeThemeColorOver,
  themeColorToRgbaTuple,
} from './fieldGridActiveCells';
import { createFieldGridConfig } from './fieldGridConfig';
import {
  buildFieldGridLabelPixels,
  hexToRgba,
  type FieldGridTextureColors,
  type Rgba,
} from './fieldGridLabelPixels';
import { isLabelGlyphPixelOn } from './fieldGridDigitGlyphs';

const FILL: Rgba = [10, 20, 30, 255];
const TRANSPARENT: Rgba = [0, 0, 0, 0];
const LINE: Rgba = [200, 200, 200, 255];
const TEXT: Rgba = [1, 2, 3, 255];
const ACTIVE_FILL: Rgba = FIELD_ACTIVE_FILL_RGBA;
const ACTIVE_CENTER: Rgba = FIELD_ACTIVE_CENTER_RGBA;

const COLORS: FieldGridTextureColors = {
  fill: FILL,
  line: LINE,
  text: TEXT,
  activeFill: ACTIVE_FILL,
  activeCenter: ACTIVE_CENTER,
};

function sample(
  data: Uint8Array,
  width: number,
  x: number,
  y: number,
): Rgba {
  const i = (y * width + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
}

function countColorInRect(
  data: Uint8Array,
  width: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  color: Rgba,
): number {
  let n = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const px = sample(data, width, x, y);
      if (px[0] === color[0] && px[1] === color[1] && px[2] === color[2]) {
        n += 1;
      }
    }
  }
  return n;
}

describe('fieldGridLabelPixels', () => {
  const config = createFieldGridConfig(50, 21, 60);

  it('builds a pitch-sized transparent RGBA buffer with grid lines and text ink', () => {
    const { data, width, height } = buildFieldGridLabelPixels(config, COLORS);
    expect(width).toBe(3050);
    expect(height).toBe(1282);
    expect(data.length).toBe(3050 * 1282 * 4);
    // Avoid bottom-right label ink; sample near cell center of an inactive corner cell.
    expect(sample(data, width, 30, 30)).toEqual(TRANSPARENT);
    expect(sample(data, width, 0, 30)).toEqual(LINE);
    expect(sample(data, width, 61, 30)).toEqual(LINE);
  });

  it('omits grid divider pixels when divider visibility is disabled', () => {
    const hidden = createFieldGridConfig(50, 21, 60, 1, false);
    const { data, width } = buildFieldGridLabelPixels(hidden, COLORS);
    expect(sample(data, width, 0, 30)).toEqual(TRANSPARENT);
    expect(sample(data, width, 61, 30)).toEqual(TRANSPARENT);
    // Even highlighted active cells must not retain divider-colored borders.
    expect(sample(data, width, 30, 611)).toEqual(ACTIVE_FILL);
    // Disabling visual lines does not change the logical cell pitch.
    expect(width).toBe(3050);
  });

  it('paints small cell-1 ink raised in the camera bottom-right corner', () => {
    const { data, width } = buildFieldGridLabelPixels(config, COLORS);
    // Cell (0,0): raised ~LABEL_PADDING+LABEL_RAISE along data x, low data y-in-cell.
    const textPixels = countColorInRect(data, width, 10, 30, 1223, 1241, TEXT);
    expect(textPixels).toBeGreaterThan(5);
    expect(isLabelGlyphPixelOn('1', 2, 0)).toBe(true);
  });

  it('fills the active center band with surfaceRaised and a center mark', () => {
    const { data, width } = buildFieldGridLabelPixels(config, COLORS);
    // Active cell (col0,row10): x∈[1,61), data y∈[611,671).
    expect(sample(data, width, 20, 620)).toEqual(ACTIVE_FILL);
    expect(sample(data, width, 30, 640)).toEqual(ACTIVE_CENTER);
    // Outside the active band stays base fill.
    expect(sample(data, width, 20, 50)).toEqual(TRANSPARENT);
  });

  it('defaults active colors when omitted', () => {
    const { data, width } = buildFieldGridLabelPixels(config, {
      fill: FILL,
      line: LINE,
      text: TEXT,
    });
    expect(sample(data, width, 20, 620)).toEqual(ACTIVE_FILL);
    expect(sample(data, width, 30, 640)).toEqual(ACTIVE_CENTER);
  });

  it('skips surfaceRaised active fills when showActiveCells is off', () => {
    const { data, width } = buildFieldGridLabelPixels(config, COLORS, {
      showActiveCells: false,
    });
    expect(sample(data, width, 20, 620)).toEqual(TRANSPARENT);
    expect(sample(data, width, 30, 630)).toEqual(ACTIVE_CENTER);
  });

  it('skips pink centers when showActiveCenters is off', () => {
    const { data, width } = buildFieldGridLabelPixels(config, COLORS, {
      showActiveCenters: false,
    });
    expect(sample(data, width, 20, 620)).toEqual(ACTIVE_FILL);
    expect(sample(data, width, 30, 630)).toEqual(ACTIVE_FILL);
  });

  it('skips cell numbers when showCellLabels is off', () => {
    const { data, width } = buildFieldGridLabelPixels(config, COLORS, {
      showCellLabels: false,
    });
    const textPixels = countColorInRect(data, width, 10, 30, 1223, 1241, TEXT);
    expect(textPixels).toBe(0);
  });

  it('bakes a streamed chunk with absolute XY labels', () => {
    const chunk = createFieldGridConfig(10, 21, 60);
    const { data, width, height } = buildFieldGridLabelPixels(
      chunk,
      COLORS,
      undefined,
      10,
    );
    expect(width).toBe(610);
    expect(height).toBe(1282);
    // Absolute col 10 / row 0 → label "11,1" ink in local cell (0,0).
    const textPixels = countColorInRect(data, width, 10, 40, 1202, 1250, TEXT);
    expect(textPixels).toBeGreaterThan(5);
  });

  it('uses the surfaceRaised theme token for active-cell fills', () => {
    expect(FIELD_ACTIVE_FILL_HEX).toBe(currentThemeColors().surfaceRaised);
    expect(FIELD_ACTIVE_FILL_RGBA).toEqual(
      themeColorToRgbaTuple(currentThemeColors().surfaceRaised),
    );
  });

  it('composites translucent surfaceDivider over the surface for texture rendering', () => {
    expect(compositeThemeColorOver('rgba(0, 0, 0, 0.1)', '#ffffff')).toBe('#e5e5e5');
    expect(compositeThemeColorOver('#112233', '#ffffff')).toBe('#112233');
  });

  it('converts all CSS color formats accepted for theme colors', () => {
    expect(themeColorToRgbaTuple('#112233')).toEqual([17, 34, 51, 255]);
    expect(themeColorToRgbaTuple('#11223380')).toEqual([17, 34, 51, 128]);
    expect(themeColorToRgbaTuple('rgb(17, 34, 51)')).toEqual([17, 34, 51, 255]);
    expect(themeColorToRgbaTuple('rgba(17, 34, 51, 0.5)')).toEqual([17, 34, 51, 128]);
  });

  it('parses hex colors', () => {
    expect(hexToRgba('#112233')).toEqual([17, 34, 51, 255]);
    expect(hexToRgba('#abc', 128)).toEqual([170, 187, 204, 128]);
    expect(themeColorToRgbaTuple(FIELD_ACTIVE_FILL_HEX)).toEqual(ACTIVE_FILL);
  });
});
