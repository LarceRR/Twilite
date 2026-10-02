import { describe, expect, it } from 'vitest';

import { FLOATS_PER_SPRITE, writeSpriteQuad } from './spriteBatch';

describe('writeSpriteQuad', () => {
  it('writes two triangles with matching UV corners and advances the offset', () => {
    const target = new Float32Array(FLOATS_PER_SPRITE * 2);
    const next = writeSpriteQuad(target, FLOATS_PER_SPRITE, {
      left: -1,
      right: 1,
      bottom: -1,
      top: 1,
      u0: 0,
      v0: 0,
      u1: 0.5,
      v1: 0.25,
    });

    expect(next).toBe(FLOATS_PER_SPRITE * 2);
    // first vertex: bottom-left → (u0, v1)
    expect([...target.slice(24, 28)]).toEqual([-1, -1, 0, 0.25]);
    // last vertex: top-right → (u1, v0)
    expect([...target.slice(44, 48)]).toEqual([1, 1, 0.5, 0]);
    // first slot untouched
    expect([...target.slice(0, 4)]).toEqual([0, 0, 0, 0]);
  });
});
