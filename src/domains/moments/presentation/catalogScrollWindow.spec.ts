import { describe, expect, it } from 'vitest';

import {
  isBandVisible,
  nextActiveIds,
  readScrollMetrics,
  sameIds,
  shouldLoadMore,
} from './catalogScrollWindow';

describe('catalog scroll window', () => {
  it('treats a band inside the viewport and overscan as visible', () => {
    expect(isBandVisible({ y: 500, height: 80 }, 400, 200, 40)).toBe(true);
    expect(isBandVisible({ y: 900, height: 80 }, 400, 200, 40)).toBe(false);
  });

  it('loads the next page near the end of the content', () => {
    expect(shouldLoadMore({ offset: 700, viewport: 400, contentHeight: 1200 }, 200)).toBe(true);
    expect(shouldLoadMore({ offset: 0, viewport: 400, contentHeight: 1200 }, 200)).toBe(false);
  });

  it('keeps a playing pack mounted until it leaves the hold margin', () => {
    const bands = new Map([['a', { y: 200, height: 80 }]]);
    const entered = nextActiveIds(new Set(), bands, 0, 400, 0);
    const held = nextActiveIds(entered, bands, 600, 400, 0);
    const gone = nextActiveIds(held, bands, 900, 400, 0);

    expect([...entered]).toEqual(['a']);
    expect(held.has('a')).toBe(true);
    expect(gone.has('a')).toBe(false);
    expect(sameIds(entered, held)).toBe(true);
    expect(sameIds(held, gone)).toBe(false);
  });

  it('reads non-negative scroll metrics', () => {
    expect(
      readScrollMetrics({
        contentOffset: { y: -4 },
        layoutMeasurement: { height: 600 },
        contentSize: { height: 1400 },
      }),
    ).toEqual({ offset: 0, viewport: 600, contentHeight: 1400 });
  });
});
