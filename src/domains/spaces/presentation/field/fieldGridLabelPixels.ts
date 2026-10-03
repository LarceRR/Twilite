import {
  fieldActiveCenterRgba,
  fieldActiveFillRgba,
  isActiveFieldGridCell,
} from './fieldGridActiveCells';
import { getFieldConfig } from './fieldConfigStore';
import { createFieldGridCells } from './fieldGridCells';
import type { FieldGridConfig } from './fieldGridConfig';
import { fieldGridWorldSize } from './fieldGridConfig';
import {
  DIGIT_GLYPH_HEIGHT,
  DIGIT_GLYPH_WIDTH,
  isDigitGlyphPixelOn,
} from './fieldGridDigitGlyphs';

export type Rgba = readonly [number, number, number, number];

export type FieldGridTextureColors = {
  readonly fill: Rgba;
  readonly line: Rgba;
  readonly text: Rgba;
  readonly activeFill?: Rgba;
  readonly activeCenter?: Rgba;
};

export type FieldGridLayerFlags = {
  readonly showActiveCells: boolean;
  readonly showActiveCenters: boolean;
  readonly showCellLabels: boolean;
};

export const DEFAULT_FIELD_GRID_LAYER_FLAGS: FieldGridLayerFlags = {
  showActiveCells: true,
  showActiveCenters: true,
  showCellLabels: true,
};

function resolveColors(colors: FieldGridTextureColors): {
  readonly fill: Rgba;
  readonly line: Rgba;
  readonly text: Rgba;
  readonly activeFill: Rgba;
  readonly activeCenter: Rgba;
} {
  return {
    fill: colors.fill,
    line: colors.line,
    text: colors.text,
    activeFill: colors.activeFill ?? fieldActiveFillRgba(),
    activeCenter: colors.activeCenter ?? fieldActiveCenterRgba(),
  };
}

function resolveLayerFlags(flags?: Partial<FieldGridLayerFlags>): FieldGridLayerFlags {
  return {
    showActiveCells: flags?.showActiveCells ?? DEFAULT_FIELD_GRID_LAYER_FLAGS.showActiveCells,
    showActiveCenters:
      flags?.showActiveCenters ?? DEFAULT_FIELD_GRID_LAYER_FLAGS.showActiveCenters,
    showCellLabels: flags?.showCellLabels ?? DEFAULT_FIELD_GRID_LAYER_FLAGS.showCellLabels,
  };
}

/** Solid fill without per-pixel bounds checks (hot path for chunk bake). */
function fillBuffer(data: Uint8Array, color: Rgba): void {
  const r = color[0];
  const g = color[1];
  const b = color[2];
  const a = color[3];
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
}

function fillRect(
  data: Uint8Array,
  width: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: Rgba,
): void {
  const height = data.length / (width * 4);
  const xStart = Math.max(0, x0);
  const yStart = Math.max(0, y0);
  const xEnd = Math.min(width, x0 + w);
  const yEnd = Math.min(height, y0 + h);
  if (xStart >= xEnd || yStart >= yEnd) return;

  const r = color[0];
  const g = color[1];
  const b = color[2];
  const a = color[3];
  for (let y = yStart; y < yEnd; y += 1) {
    let i = (y * width + xStart) * 4;
    for (let x = xStart; x < xEnd; x += 1) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
      i += 4;
    }
  }
}

/** Texture-local origin; `col` is absolute, remapped via `colStart`. */
function cellDataOrigin(
  col: number,
  row: number,
  config: FieldGridConfig,
  colStart: number,
): { readonly minX: number; readonly minY: number } {
  return {
    minX: (col - colStart) * config.cellSize,
    minY: (config.rows - 1 - row) * config.cellSize,
  };
}

function drawActiveFills(
  data: Uint8Array,
  config: FieldGridConfig,
  colStart: number,
  color: Rgba,
): void {
  const { width } = fieldGridWorldSize(config);
  for (const cell of createFieldGridCells(config, colStart)) {
    if (!isActiveFieldGridCell(cell.row, config.rows)) continue;
    const { minX, minY } = cellDataOrigin(cell.col, cell.row, config, colStart);
    fillRect(data, width, minX, minY, config.cellSize, config.cellSize, color);
  }
}

function drawGridLines(
  data: Uint8Array,
  config: FieldGridConfig,
  line: Rgba,
): void {
  const { width, height } = fieldGridWorldSize(config);
  for (let c = 0; c <= config.cols; c += 1) {
    const x = Math.min(c * config.cellSize, width - 1);
    fillRect(data, width, x, 0, 1, height, line);
  }
  for (let r = 0; r <= config.rows; r += 1) {
    const y = Math.min(r * config.cellSize, height - 1);
    fillRect(data, width, 0, y, width, 1, line);
  }
}

function drawActiveBorders(
  data: Uint8Array,
  config: FieldGridConfig,
  colStart: number,
  color: Rgba,
): void {
  const { width } = fieldGridWorldSize(config);
  const border = getFieldConfig().labels.activeBorder;
  const s = config.cellSize;
  for (const cell of createFieldGridCells(config, colStart)) {
    if (!isActiveFieldGridCell(cell.row, config.rows)) continue;
    const { minX, minY } = cellDataOrigin(cell.col, cell.row, config, colStart);
    fillRect(data, width, minX, minY, s, border, color);
    fillRect(data, width, minX, minY + s - border, s, border, color);
    fillRect(data, width, minX, minY, border, s, color);
    fillRect(data, width, minX + s - border, minY, border, s, color);
  }
}

function drawDigit(
  data: Uint8Array,
  width: number,
  minDataX: number,
  minDataY: number,
  digit: string,
  scale: number,
  color: Rgba,
): void {
  for (let gy = 0; gy < DIGIT_GLYPH_HEIGHT; gy += 1) {
    for (let gx = 0; gx < DIGIT_GLYPH_WIDTH; gx += 1) {
      if (!isDigitGlyphPixelOn(digit, gx, gy)) continue;
      const dx = minDataX + (DIGIT_GLYPH_HEIGHT - 1 - gy) * scale;
      const dy = minDataY + (DIGIT_GLYPH_WIDTH - 1 - gx) * scale;
      fillRect(data, width, dx, dy, scale, scale, color);
    }
  }
}

function drawLabelBottomRight(
  data: Uint8Array,
  width: number,
  cellMinX: number,
  cellMinY: number,
  label: string,
  color: Rgba,
): void {
  const { scale, padding, raise } = getFieldConfig().labels;
  const alongY = DIGIT_GLYPH_WIDTH * scale;
  const gap = scale;
  const startX = cellMinX + padding + raise;
  let digitMinY = cellMinY + padding + (label.length - 1) * (alongY + gap);
  for (const ch of label) {
    drawDigit(data, width, startX, digitMinY, ch, scale, color);
    digitMinY -= alongY + gap;
  }
}

function drawActiveCenters(
  data: Uint8Array,
  config: FieldGridConfig,
  colStart: number,
  color: Rgba,
): void {
  const { width } = fieldGridWorldSize(config);
  const size = getFieldConfig().labels.activeCenterSize;
  const half = Math.floor(size / 2);
  for (const cell of createFieldGridCells(config, colStart)) {
    if (!isActiveFieldGridCell(cell.row, config.rows)) continue;
    const { minX, minY } = cellDataOrigin(cell.col, cell.row, config, colStart);
    const cx = minX + Math.floor(config.cellSize / 2) - half;
    const cy = minY + Math.floor(config.cellSize / 2) - half;
    fillRect(data, width, cx, cy, size, size, color);
  }
}

function drawCellLabels(
  data: Uint8Array,
  config: FieldGridConfig,
  colStart: number,
  text: Rgba,
): void {
  const { width } = fieldGridWorldSize(config);
  for (const cell of createFieldGridCells(config, colStart)) {
    const { minX, minY } = cellDataOrigin(cell.col, cell.row, config, colStart);
    drawLabelBottomRight(data, width, minX, minY, cell.label, text);
  }
}

/** Builds RGBA pixels for a grid slice texture (`colStart` = absolute first column). */
export function buildFieldGridLabelPixels(
  config: FieldGridConfig,
  colors: FieldGridTextureColors,
  layerFlags?: Partial<FieldGridLayerFlags>,
  colStart: number = 0,
): { readonly data: Uint8Array; readonly width: number; readonly height: number } {
  const resolved = resolveColors(colors);
  const layers = resolveLayerFlags(layerFlags);
  const { width, height } = fieldGridWorldSize(config);
  const data = new Uint8Array(width * height * 4);
  fillBuffer(data, resolved.fill);
  if (layers.showActiveCells) {
    drawActiveFills(data, config, colStart, resolved.activeFill);
  }
  drawGridLines(data, config, resolved.line);
  if (layers.showActiveCells) {
    drawActiveBorders(data, config, colStart, resolved.line);
  }
  if (layers.showActiveCenters) {
    drawActiveCenters(data, config, colStart, resolved.activeCenter);
  }
  if (layers.showCellLabels) {
    drawCellLabels(data, config, colStart, resolved.text);
  }
  return { data, width, height };
}

export function hexToRgba(hex: string, alpha: number = 255): Rgba {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}
