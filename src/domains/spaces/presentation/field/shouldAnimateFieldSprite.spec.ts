import { describe, expect, it } from 'vitest';

import {
  FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW,
  shouldAnimateFieldSprite,
} from './shouldAnimateFieldSprite';

describe('shouldAnimateFieldSprite', () => {
  it('animates rows before the LOD cutoff', () => {
    expect(shouldAnimateFieldSprite(0)).toBe(true);
    expect(shouldAnimateFieldSprite(FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW - 1)).toBe(true);
  });

  it('freezes the cutoff row and beyond', () => {
    expect(shouldAnimateFieldSprite(FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW)).toBe(false);
    expect(shouldAnimateFieldSprite(FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW + 3)).toBe(false);
  });
});
