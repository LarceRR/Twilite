import { describe, expect, it, vi } from 'vitest';

import { openMomentFilters } from './openMomentFilters';

describe('openMomentFilters', () => {
  it('pushes the filters sheet route', () => {
    const push = vi.fn();
    openMomentFilters({ push });
    expect(push).toHaveBeenCalledWith('/moment-filters');
  });
});
