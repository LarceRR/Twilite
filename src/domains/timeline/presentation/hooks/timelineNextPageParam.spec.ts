import { describe, expect, it } from 'vitest';

import { timelineNextPageParam } from './timelineNextPageParam';

describe('timelineNextPageParam', () => {
  it('treats null as end of list', () => {
    expect(timelineNextPageParam(null)).toBeUndefined();
  });

  it('passes through a real cursor', () => {
    expect(timelineNextPageParam('evt-1')).toBe('evt-1');
  });
});
