import { describe, expect, it } from 'vitest';

import { BRIDGE_CENTER_COLUMN } from '@/domains/surfaces/domain/services/spawnBridgeRow';

import {
  bridgeCellToScaledWorld,
  bridgeCellToWorld,
  compressionToScale,
  FIELD_CELL_SIZE,
  FIELD_PLATFORM_Y,
  SURFACE_SCALE_STRENGTH,
  surfaceRowBlend,
  surfaceRowScale,
} from './fieldLayout';

describe('bridgeCellToWorld', () => {
  it('places the center column on x = 0 at platform height', () => {
    const world = bridgeCellToWorld({ x: BRIDGE_CENTER_COLUMN, y: 0 });
    expect(world.x).toBe(0);
    expect(world.y).toBe(FIELD_PLATFORM_Y);
    expect(world.z).toBeCloseTo(0);
  });

  it('steps one cell size per column and row', () => {
    const origin = bridgeCellToWorld({ x: BRIDGE_CENTER_COLUMN, y: 0 });
    const right = bridgeCellToWorld({ x: BRIDGE_CENTER_COLUMN + 1, y: 0 });
    const ahead = bridgeCellToWorld({ x: BRIDGE_CENTER_COLUMN, y: 3 });
    expect(right.x - origin.x).toBe(FIELD_CELL_SIZE);
    expect(ahead.z - origin.z).toBe(-3 * FIELD_CELL_SIZE);
  });
});

describe('compressionToScale', () => {
  it('keeps 100% base squeeze compatible with the saved framing', () => {
    expect(compressionToScale(0)).toBe(1);
    expect(compressionToScale(1)).toBeCloseTo(1 - SURFACE_SCALE_STRENGTH);
  });

  it('expands when compression is negative', () => {
    expect(compressionToScale(-1)).toBeGreaterThan(1);
  });
});

describe('surfaceRowScale', () => {
  const span = 24;

  it('keeps the near edge on base scale and the far edge on end scale', () => {
    expect(surfaceRowScale(-0.5, 1, 0, span)).toBeCloseTo(compressionToScale(1));
    expect(surfaceRowScale(span - 0.5, 1, 0, span)).toBeCloseTo(compressionToScale(0));
  });

  it('interpolates width in a straight line so the far end is not a hammer head', () => {
    expect(surfaceRowBlend(-0.5, span)).toBe(0);
    expect(surfaceRowBlend(span - 0.5, span)).toBeCloseTo(1);
    expect(surfaceRowBlend(span / 2 - 0.5, span)).toBeCloseTo(0.5);
    const near = surfaceRowScale(-0.5, 1.2, -2.15, span);
    const mid = surfaceRowScale(span / 2 - 0.5, 1.2, -2.15, span);
    const far = surfaceRowScale(span - 0.5, 1.2, -2.15, span);
    expect(mid).toBeCloseTo((near + far) / 2);
  });

  it('scales sprite X to the tapered cell center and leaves z alone', () => {
    const cell = { x: BRIDGE_CENTER_COLUMN + 2, y: 0 };
    const natural = bridgeCellToWorld(cell);
    const scaled = bridgeCellToScaledWorld(cell, 1, 0, span);
    expect(scaled.x).toBeCloseTo(natural.x * surfaceRowScale(cell.y, 1, 0, span));
    expect(scaled.z).toBe(natural.z);
  });
});
