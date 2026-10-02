import { describe, expect, it } from 'vitest';

import { SpriteTextureBudget, textureCacheKeyString } from './spriteTextureBudget';

describe('SpriteTextureBudget', () => {
  it('builds stable cache keys', () => {
    expect(textureCacheKeyString({ url: 'https://x/a.png', revision: 3 })).toBe(
      'https://x/a.png#r=3',
    );
  });

  it('evicts LRU when over budget', () => {
    const evicted: string[] = [];
    const budget = new SpriteTextureBudget(100, (event) => {
      if (event.type === 'evict') evicted.push(event.key);
    });
    expect(budget.touch('a', 60)).toEqual([]);
    expect(budget.touch('b', 60)).toEqual(['a']);
    expect(evicted).toEqual(['a']);
    expect(budget.usedBytes).toBe(60);
  });
});
