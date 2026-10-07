import { describe, expect, it, vi } from 'vitest';

import { openCreateSheet } from './openCreateSheet';
import { routes } from './types';

describe('openCreateSheet', () => {
  it('pushes the create sheet route', () => {
    const push = vi.fn();
    openCreateSheet({ push });
    expect(push).toHaveBeenCalledWith(routes.create);
  });
});
