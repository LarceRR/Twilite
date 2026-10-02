import { describe, expect, it } from 'vitest';

import { BRIDGE_COLUMN_COUNT } from '@/domains/surfaces/domain/services/spawnBridgeRow';

import {
  bridgeDeckCellCorners,
  bridgeDeckCellUv,
  buildTaperedBridgeDeck,
  deckFarHalfWidth,
  deckNearHalfWidth,
} from './bridgeDeckGeometry';
import { BRIDGE_HALF_WIDTH, compressionToScale, surfaceRowScale } from './fieldLayout';

describe('buildTaperedBridgeDeck', () => {
  it('emits one quad per cell with a constant texel uv', () => {
    const rows = 4;
    const deck = buildTaperedBridgeDeck(0, 0, rows);
    const cells = rows * BRIDGE_COLUMN_COUNT;
    expect(deck.rowCount).toBe(rows);
    expect(deck.columnCount).toBe(BRIDGE_COLUMN_COUNT);
    expect(deck.positions.length).toBe(cells * 4 * 3);
    expect(deck.indices.length).toBe(cells * 6);
    for (let i = 0; i < deck.uvs.length; i += 1) {
      expect(deck.uvs[i]).toBeGreaterThanOrEqual(0);
      expect(deck.uvs[i]).toBeLessThanOrEqual(1);
    }
    const uv = bridgeDeckCellUv(3, 1, rows);
    const offset = (1 * BRIDGE_COLUMN_COUNT + 3) * 8;
    for (let vertex = 0; vertex < 4; vertex += 1) {
      expect(deck.uvs[offset + vertex * 2]).toBeCloseTo(uv.u);
      expect(deck.uvs[offset + vertex * 2 + 1]).toBeCloseTo(uv.v);
    }
  });

  it('writes cell corners from the tapered column edges', () => {
    const deck = buildTaperedBridgeDeck(1, -0.5, 4);
    const corners = bridgeDeckCellCorners(3, 2, 1, -0.5, 4);
    const offset = (2 * BRIDGE_COLUMN_COUNT + 3) * 12;
    expect(deck.positions[offset]).toBeCloseTo(corners[0].x);
    expect(deck.positions[offset + 2]).toBeCloseTo(corners[0].z);
    expect(deck.positions[offset + 9]).toBeCloseTo(corners[3].x);
    expect(deck.positions[offset + 11]).toBeCloseTo(corners[3].z);
  });

  it('matches base width at the near rail and end width at the far tip', () => {
    const base = 1;
    const end = 0;
    const rows = 24;
    expect(deckNearHalfWidth(base, end)).toBeCloseTo(
      BRIDGE_HALF_WIDTH * surfaceRowScale(-0.5, base, end, rows),
    );
    expect(deckFarHalfWidth(base, end, rows)).toBeCloseTo(
      BRIDGE_HALF_WIDTH * surfaceRowScale(rows - 0.5, base, end, rows),
    );
    expect(deckNearHalfWidth(base, end)).toBeCloseTo(BRIDGE_HALF_WIDTH * compressionToScale(base));
    expect(deckFarHalfWidth(base, end, rows)).toBeCloseTo(
      BRIDGE_HALF_WIDTH * compressionToScale(end),
    );
  });

  it('keeps a constant rail slope from base width to end width', () => {
    const rows = 28;
    const base = 1.2;
    const end = -2.15;
    const left: number[] = [];
    for (let row = 0; row < rows; row += 1) {
      left.push(bridgeDeckCellCorners(0, row, base, end, rows)[0].x);
    }
    left.push(bridgeDeckCellCorners(0, rows - 1, base, end, rows)[3].x);
    const step = (left[1] ?? 0) - (left[0] ?? 0);
    for (let i = 2; i < left.length; i += 1) {
      expect((left[i] ?? 0) - (left[i - 1] ?? 0)).toBeCloseTo(step);
    }
  });

  it('keeps left and right rails continuous across row seams', () => {
    const rows = 8;
    const base = 1;
    const end = -0.5;
    for (let row = 0; row < rows - 1; row += 1) {
      const far = bridgeDeckCellCorners(0, row, base, end, rows)[3];
      const next = bridgeDeckCellCorners(0, row + 1, base, end, rows)[0];
      expect(far.x).toBe(next.x);
      expect(far.z).toBe(next.z);
    }
  });

  it('welds neighboring cells along the shared column edge', () => {
    const left = bridgeDeckCellCorners(3, 2, 1, -0.5, 8);
    const right = bridgeDeckCellCorners(4, 2, 1, -0.5, 8);
    expect(left[1].x).toBe(right[0].x);
    expect(left[1].z).toBe(right[0].z);
    expect(left[2].x).toBe(right[3].x);
    expect(left[2].z).toBe(right[3].z);
  });

  it('keeps each cell side centered on the taper when the base is squeezed', () => {
    const rows = 12;
    const base = 1.4;
    const end = -1;
    const column = 3;
    const row = 4;
    const corners = bridgeDeckCellCorners(column, row, base, end, rows);
    const halfNear = BRIDGE_HALF_WIDTH * surfaceRowScale(row - 0.5, base, end, rows);
    const halfFar = BRIDGE_HALF_WIDTH * surfaceRowScale(row + 0.5, base, end, rows);
    const halfMid = BRIDGE_HALF_WIDTH * surfaceRowScale(row, base, end, rows);
    expect(edgeFraction(corners[0].x, halfNear)).toBeCloseTo(column / BRIDGE_COLUMN_COUNT);
    expect(edgeFraction(corners[3].x, halfFar)).toBeCloseTo(column / BRIDGE_COLUMN_COUNT);
    expect(edgeFraction(corners[1].x, halfNear)).toBeCloseTo((column + 1) / BRIDGE_COLUMN_COUNT);
    expect(edgeFraction(corners[2].x, halfFar)).toBeCloseTo((column + 1) / BRIDGE_COLUMN_COUNT);
    const midLeft = (corners[0].x + corners[3].x) / 2;
    const midRight = (corners[1].x + corners[2].x) / 2;
    expect(edgeFraction(midLeft, halfMid)).toBeCloseTo(column / BRIDGE_COLUMN_COUNT);
    expect(edgeFraction(midRight, halfMid)).toBeCloseTo((column + 1) / BRIDGE_COLUMN_COUNT);
  });
});

function edgeFraction(x: number, halfWidth: number): number {
  return (x / halfWidth + 1) / 2;
}
