import { describe, expect, it } from 'vitest';

import { bridgeInstanceCounts, bridgeRowCapacity, visibleBridgeRows } from './bridgeRows';

describe('bridgeRows', () => {
  it('keeps the historical minimum and look-ahead', () => {
    expect(visibleBridgeRows(0)).toBe(28);
    expect(visibleBridgeRows(20)).toBe(34);
  });

  it('grows capacity in whole chunks', () => {
    expect(bridgeRowCapacity(28)).toBe(31);
    expect(bridgeRowCapacity(31)).toBe(31);
    expect(bridgeRowCapacity(32)).toBe(63);
  });

  it('splits the checkerboard per row', () => {
    expect(bridgeInstanceCounts(0)).toEqual({ even: 3, odd: 2 });
    expect(bridgeInstanceCounts(1)).toEqual({ even: 5, odd: 5 });
  });
});
