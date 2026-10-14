import { fieldActiveFillRgba, isActiveFieldGridCell } from './fieldGridActiveCells';
import { hexToRgbaTuple, type FieldConfig } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import { cellLabelFromColRow } from './fieldGridCells';
import type { FieldGridConfig } from './fieldGridConfig';
import {
  FIELD_GRID_DIVIDER_WIDTH,
  fieldGridCellPitch,
  fieldGridWorldSize,
} from './fieldGridConfig';
import {
  LABEL_GLYPH_HEIGHT,
  LABEL_GLYPH_WIDTH,
  isLabelGlyphPixelOn,
} from './fieldGridDigitGlyphs';

export type Rgba = readonly [number, number, number, number];

export type FieldGridTextureColors = {
  /** Base surface color used for cache identity; transparent pixels reveal the lit mesh underneath. */
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

function resolveColors(
  colors: FieldGridTextureColors,
  activeCells: FieldConfig['activeCells'],
): {
  readonly line: Rgba;
  readonly text: Rgba;
  readonly activeFill: Rgba;
  readonly activeCenter: Rgba;
} {
  return {
    line: colors.line,
    text: colors.text,
    activeFill: colors.activeFill ?? fieldActiveFillRgba(),
    activeCenter: colors.activeCenter ?? hexToRgbaTuple(activeCells.centerHex),
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

function fillRect(
  data: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: Rgba,
): void {
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
  const pitch = fieldGridCellPitch(config);
  const inset = config.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH;
  return {
    minX: (col - colStart) * pitch + inset,
    minY: (config.rows - 1 - row) * pitch + inset,
  };
}

type FieldGridPixelCell = {
  readonly col: number;
  readonly row: number;
  readonly label: string;
};

/** Pixel baking needs labels and coordinates only, not 3D centers/index objects. */
function createFieldGridPixelCells(
  config: FieldGridConfig,
  colStart: number,
): readonly FieldGridPixelCell[] {
  const cells: FieldGridPixelCell[] = [];
  for (let localCol = 0; localCol < config.cols; localCol += 1) {
    const col = colStart + localCol;
    for (let row = 0; row < config.rows; row += 1) {
      cells.push({ col, row, label: cellLabelFromColRow(col, row) });
    }
  }
  return cells;
}

function drawActiveFills(
  data: Uint8Array,
  config: FieldGridConfig,
  colStart: number,
  color: Rgba,
  sideSpan: number,
  cells: readonly FieldGridPixelCell[],
): void {
  const { width, height } = fieldGridWorldSize(config);
  for (const cell of cells) {
    if (!isActiveFieldGridCell(cell.row, config.rows, sideSpan)) continue;
    const { minX, minY } = cellDataOrigin(cell.col, cell.row, config, colStart);
    fillRect(data, width, height, minX, minY, config.cellSize, config.cellSize, color);
  }
}

function drawGridLines(
  data: Uint8Array,
  config: FieldGridConfig,
  line: Rgba,
): void {
  if (config.showDividers === false) return;
  const { width, height } = fieldGridWorldSize(config);
  const pitch = fieldGridCellPitch(config);
  for (let c = 0; c < config.cols; c += 1) {
    const x = Math.min(c * pitch, width - 1);
    fillRect(
      data,
      width,
      height,
      x,
      0,
      config.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH,
      height,
      line,
    );
  }
  for (let r = 0; r <= config.rows; r += 1) {
    const y = Math.min(r * pitch, height - 1);
    fillRect(
      data,
      width,
      height,
      0,
      y,
      width,
      config.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH,
      line,
    );
  }
}

function drawActiveBorders(
  data: Uint8Array,
  config: FieldGridConfig,
  colStart: number,
  color: Rgba,
  border: number,
  sideSpan: number,
  cells: readonly FieldGridPixelCell[],
): void {
  const { width, height } = fieldGridWorldSize(config);
  const s = config.cellSize;
  for (const cell of cells) {
    if (!isActiveFieldGridCell(cell.row, config.rows, sideSpan)) continue;
    const { minX, minY } = cellDataOrigin(cell.col, cell.row, config, colStart);
    fillRect(data, width, height, minX, minY, s, border, color);
    fillRect(data, width, height, minX, minY + s - border, s, border, color);
    fillRect(data, width, height, minX, minY, border, s, color);
    fillRect(data, width, height, minX + s - border, minY, border, s, color);
  }
}

function drawDigit(
  data: Uint8Array,
  width: number,
  height: number,
  minDataX: number,
  minDataY: number,
  glyph: string,
  scale: number,
  color: Rgba,
): void {
  const [r, g, b, a] = color;
  for (let gy = 0; gy < LABEL_GLYPH_HEIGHT; gy += 1) {
    for (let gx = 0; gx < LABEL_GLYPH_WIDTH; gx += 1) {
      if (!isLabelGlyphPixelOn(glyph, gx, gy)) continue;
      const dx = minDataX + (LABEL_GLYPH_HEIGHT - 1 - gy) * scale;
      const dy = minDataY + (LABEL_GLYPH_WIDTH - 1 - gx) * scale;

      if (scale === 1) {
        if (dx < 0 || dx >= width || dy < 0 || dy >= height) continue;
        const offset = (dy * width + dx) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = a;
      } else {
        fillRect(data, width, height, dx, dy, scale, scale, color);
      }
    }
  }
}

type FieldLabelLayout = Pick<FieldConfig['labels'], 'scale' | 'padding' | 'raise'>;

function drawLabelBottomRight(
  data: Uint8Array,
  width: number,
  height: number,
  cellMinX: number,
  cellMinY: number,
  label: string,
  color: Rgba,
  layout: FieldLabelLayout,
): void {
  const { scale, padding, raise } = layout;
  const alongY = LABEL_GLYPH_WIDTH * scale;
  const gap = scale;
  const startX = cellMinX + padding + raise;
  let glyphMinY = cellMinY + padding + (label.length - 1) * (alongY + gap);
  for (const ch of label) {
    drawDigit(data, width, height, startX, glyphMinY, ch, scale, color);
    glyphMinY -= alongY + gap;
  }
}

function drawActiveCenters(
  data: Uint8Array,
  config: FieldGridConfig,
  colStart: number,
  color: Rgba,
  size: number,
  sideSpan: number,
  cells: readonly FieldGridPixelCell[],
): void {
  const { width, height } = fieldGridWorldSize(config);
  const half = Math.floor(size / 2);
  for (const cell of cells) {
    if (!isActiveFieldGridCell(cell.row, config.rows, sideSpan)) continue;
    const { minX, minY } = cellDataOrigin(cell.col, cell.row, config, colStart);
    const cx = minX + Math.floor(config.cellSize / 2) - half;
    const cy = minY + Math.floor(config.cellSize / 2) - half;
    fillRect(data, width, height, cx, cy, size, size, color);
  }
}

function drawCellLabels(
  data: Uint8Array,
  config: FieldGridConfig,
  colStart: number,
  text: Rgba,
  layout: FieldLabelLayout,
  cells: readonly FieldGridPixelCell[],
): void {
  const { width, height } = fieldGridWorldSize(config);
  for (const cell of cells) {
    const { minX, minY } = cellDataOrigin(cell.col, cell.row, config, colStart);
    drawLabelBottomRight(data, width, height, minX, minY, cell.label, text, layout);
  }
}

/** Builds RGBA pixels for a grid slice texture (`colStart` = absolute first column). */
export function buildFieldGridLabelPixels(
  config: FieldGridConfig,
  colors: FieldGridTextureColors,
  layerFlags?: Partial<FieldGridLayerFlags>,
  colStart: number = 0,
  runtimeConfig: FieldConfig = getFieldConfig(),
): { readonly data: Uint8Array; readonly width: number; readonly height: number } {
  const resolved = resolveColors(colors, runtimeConfig.activeCells);
  const layers = resolveLayerFlags(layerFlags);
  const { width, height } = fieldGridWorldSize(config);
  const data = new Uint8Array(width * height * 4);
  const cells = createFieldGridPixelCells(config, colStart);
  const { labels, activeCells } = runtimeConfig;
  if (layers.showActiveCells) {
    drawActiveFills(data, config, colStart, resolved.activeFill, activeCells.sideSpan, cells);
  }
  drawGridLines(data, config, resolved.line);
  if (layers.showActiveCells) {
    drawActiveBorders(
      data,
      config,
      colStart,
      resolved.line,
      labels.activeBorder,
      activeCells.sideSpan,
      cells,
    );
  }
  if (layers.showActiveCenters) {
    drawActiveCenters(
      data,
      config,
      colStart,
      resolved.activeCenter,
      labels.activeCenterSize,
      activeCells.sideSpan,
      cells,
    );
  }
  if (layers.showCellLabels) {
    drawCellLabels(data, config, colStart, resolved.text, labels, cells);
  }
  return { data, width, height };
}

export function hexToRgba(hex: string, alpha: number = 255): Rgba {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}
