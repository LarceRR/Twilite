import { describe, expect, it } from 'vitest';

import {
  FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW,
  shouldAnimateFieldSprite,
} from './shouldAnimateFieldSprite';

describe('shouldAnimateFieldSprite', () => {
  it('animates rows before the LOD cutoff (legacy number API)', () => {
    expect(shouldAnimateFieldSprite(0)).toBe(true);
    expect(shouldAnimateFieldSprite(FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW - 1)).toBe(true);
  });

  it('freezes the cutoff row and beyond', () => {
    expect(shouldAnimateFieldSprite(FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW)).toBe(false);
  });

  it('stops animation when reduceMotion or background', () => {
    expect(
      shouldAnimateFieldSprite({
        cellRow: 0,
        reduceMotion: true,
        frameCount: 4,
      }),
    ).toBe(false);
    expect(
      shouldAnimateFieldSprite({
        cellRow: 0,
        reduceMotion: false,
        appBackground: true,
        frameCount: 4,
      }),
    ).toBe(false);
  });

  it('requires at least two frames', () => {
    expect(
      shouldAnimateFieldSprite({
        cellRow: 0,
        reduceMotion: false,
        frameCount: 1,
      }),
    ).toBe(false);
  });
});
