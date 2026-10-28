import { describe, expect, it } from 'vitest';

import { isFieldGrassChunkVisible } from './fieldGrassChunkVisibility';

describe('field grass chunk visibility', () => {
  it('does not show grass before its surface chunk is ready', () => {
    expect(isFieldGrassChunkVisible(2, [0, 1, 3])).toBe(false);
  });

  it('shows grass only when the matching chunk is ready', () => {
    expect(isFieldGrassChunkVisible(2, [0, 2, 3])).toBe(true);
  });

  it('hides grass when a slot is unbound or recycled to an unready chunk', () => {
    expect(isFieldGrassChunkVisible(null, [0, 1, 2])).toBe(false);
    expect(isFieldGrassChunkVisible(6, [0, 1, 2])).toBe(false);
  });
});
