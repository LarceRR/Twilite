import { describe, expect, it } from 'vitest';

import {
  assignFieldChunkSlots,
  fieldChunkSlotCount,
  fieldChunkSlotsEqual,
} from './fieldGridChunkSlots';

describe('fieldGridChunkSlots', () => {
  it('sizes the pool to behind + anchor + ahead', () => {
    expect(fieldChunkSlotCount(1, 3)).toBe(5);
  });

  it('keeps existing slot assignments when the window slides', () => {
    const previous = [0, 1, 2, 3, null];
    const next = assignFieldChunkSlots([1, 2, 3, 4], previous, 5);
    expect(next).toEqual([4, 1, 2, 3, null]);
  });

  it('fills empty slots for a bootstrap window', () => {
    expect(assignFieldChunkSlots([0, 1, 2, 3], [null, null, null, null, null], 5)).toEqual([
      0, 1, 2, 3, null,
    ]);
  });

  it('compares slot lists by value', () => {
    expect(fieldChunkSlotsEqual([1, 2, null], [1, 2, null])).toBe(true);
    expect(fieldChunkSlotsEqual([1, 2, null], [1, 3, null])).toBe(false);
  });
});
