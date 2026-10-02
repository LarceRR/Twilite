import { describe, expect, it } from 'vitest';

import { cellKey } from '@/domains/surface-objects/domain/value-objects/Cell';

import { BRIDGE_CENTER_COLUMN, BRIDGE_COLUMN_COUNT, spawnBridgeRow } from './spawnBridgeRow';

const fixed = (): number => 0;

describe('spawnBridgeRow', () => {
  it('starts at the centre of row 0 on an empty bridge', () => {
    expect(spawnBridgeRow({ occupied: [], random: fixed })).toEqual({
      x: BRIDGE_CENTER_COLUMN,
      y: 0,
    });
  });

  it('continues after the frontmost object when lastCreated is unknown', () => {
    const occupied = [
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ];
    const cell = spawnBridgeRow({ occupied, random: fixed });

    expect(cell.y).toBe(2);
    expect(cell.x).not.toBe(1);
  });

  it('never returns an occupied cell when the next row is full', () => {
    const occupied = [
      { x: 2, y: 0 },
      ...Array.from({ length: BRIDGE_COLUMN_COUNT }, (_, x) => ({ x, y: 1 })),
    ];
    const taken = new Set(occupied.map(cellKey));
    const cell = spawnBridgeRow({ occupied, random: fixed, lastCreated: { x: 2, y: 0 } });

    expect(taken.has(cellKey(cell))).toBe(false);
    expect(cell.y).toBe(2);
  });
});
