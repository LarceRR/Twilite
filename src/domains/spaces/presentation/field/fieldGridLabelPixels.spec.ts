import { describe, expect, it } from 'vitest';

import {
  FIELD_ACTIVE_CENTER_RGBA,
  FIELD_ACTIVE_FILL_HEX,
  FIELD_ACTIVE_FILL_RGBA,
} from './fieldGridActiveCells';
import { createFieldGridConfig } from './fieldGridConfig';
import {
  buildFieldGridLabelPixels,
  hexToRgba,
  type FieldGridTextureColors,
  type Rgba,
} from './fieldGridLabelPixels';
import { isDigitGlyphPixelOn } from './fieldGridDigitGlyphs';

const FILL: Rgba = [10, 20, 30, 255];
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

  it('builds a 3000×1260 RGBA buffer with fill, grid lines, and text ink', () => {
    const { data, width, height } = buildFieldGridLabelPixels(config, COLORS);
    expect(width).toBe(3000);
    expect(height).toBe(1260);
    expect(data.length).toBe(3000 * 1260 * 4);
    // Avoid bottom-right label ink; sample near cell center of an inactive corner cell.
    expect(sample(data, width, 30, 30)).toEqual(FILL);
    expect(sample(data, width, 0, 30)).toEqual(LINE);
    expect(sample(data, width, 60, 30)).toEqual(LINE);
  });

  it('paints small cell-1 ink raised in the camera bottom-right corner', () => {
    const { data, width } = buildFieldGridLabelPixels(config, COLORS);
    // Cell (0,0): raised ~LABEL_PADDING+LABEL_RAISE along data x, low data y-in-cell.
    const textPixels = countColorInRect(data, width, 10, 30, 1202, 1220, TEXT);
    expect(textPixels).toBeGreaterThan(5);
    expect(isDigitGlyphPixelOn('1', 2, 0)).toBe(true);
  });

  it('fills the active center band with #fdba2f and a pink center mark', () => {
    const { data, width } = buildFieldGridLabelPixels(config, COLORS);
    // Active cell (col0,row10): x∈[0,60), data y∈[600,660).
    expect(sample(data, width, 20, 620)).toEqual(ACTIVE_FILL);
    expect(sample(data, width, 30, 630)).toEqual(ACTIVE_CENTER);
    // Outside the active band stays base fill.
    expect(sample(data, width, 20, 50)).toEqual(FILL);
  });

  it('defaults active colors when omitted', () => {
    const { data, width } = buildFieldGridLabelPixels(config, {
      fill: FILL,
      line: LINE,
      text: TEXT,
    });
    expect(sample(data, width, 20, 620)).toEqual(ACTIVE_FILL);
    expect(sample(data, width, 30, 630)).toEqual(ACTIVE_CENTER);
  });

  it('skips yellow active fills when showActiveCells is off', () => {
    const { data, width } = buildFieldGridLabelPixels(config, COLORS, {
      showActiveCells: false,
    });
    expect(sample(data, width, 20, 620)).toEqual(FILL);
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
    const textPixels = countColorInRect(data, width, 10, 30, 1202, 1220, TEXT);
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
    expect(width).toBe(600);
    expect(height).toBe(1260);
    // Absolute col 10 / row 0 → label "11,1" ink in local cell (0,0).
    const textPixels = countColorInRect(data, width, 10, 40, 1202, 1250, TEXT);
    expect(textPixels).toBeGreaterThan(5);
  });

  it('parses hex colors', () => {
    expect(hexToRgba('#112233')).toEqual([17, 34, 51, 255]);
    expect(hexToRgba('#abc', 128)).toEqual([170, 187, 204, 128]);
    expect(hexToRgba(FIELD_ACTIVE_FILL_HEX)).toEqual([253, 186, 47, 255]);
  });
});
