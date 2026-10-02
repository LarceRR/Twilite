import { describe, expect, it } from 'vitest';

import { spacing } from '@/design-system/spacing/spacing';
import { spaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { queryKeys } from '@/infrastructure/query/queryKeys';

import { fieldRefreshButtonTop, fieldRefreshQueryKeys, PIXEL_OBJECT_MOBILE_QUERY_KEY } from './fieldRefresh';

describe('fieldRefreshQueryKeys', () => {
  it('reloads spaces, the active surface, and sprite assets', () => {
    const id = spaceId('space-1');
    expect(fieldRefreshQueryKeys(id)).toEqual([
      queryKeys.spaces(),
      queryKeys.surface(id),
      PIXEL_OBJECT_MOBILE_QUERY_KEY,
    ]);
  });

  it('skips the surface when no space is selected', () => {
    expect(fieldRefreshQueryKeys(null)).toEqual([queryKeys.spaces(), PIXEL_OBJECT_MOBILE_QUERY_KEY]);
  });
});

describe('fieldRefreshButtonTop', () => {
  it('sits under the status bar when camera controls are hidden', () => {
    expect(fieldRefreshButtonTop(47, false)).toBe(47 + spacing.sm);
  });

  it('drops below the camera-mode chip when that chip is visible', () => {
    expect(fieldRefreshButtonTop(47, true)).toBeGreaterThan(fieldRefreshButtonTop(47, false));
  });
});
