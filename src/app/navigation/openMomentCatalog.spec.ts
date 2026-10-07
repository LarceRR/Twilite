import { describe, expect, it, vi } from 'vitest';

import { openMomentCatalog } from './openMomentCatalog';

describe('openMomentCatalog', () => {
  it('pushes a catalog sheet for the chosen kind', () => {
    const push = vi.fn();

    openMomentCatalog({ push }, 'good');
    openMomentCatalog({ push }, 'bad');

    expect(push).toHaveBeenNthCalledWith(1, '/moment-catalog?kind=good');
    expect(push).toHaveBeenNthCalledWith(2, '/moment-catalog?kind=bad');
  });
});
