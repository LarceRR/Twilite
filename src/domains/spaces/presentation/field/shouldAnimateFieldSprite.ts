/**
 * Bridge rows at or after this index keep a static preview frame.
 * Near rows stay animated; distant ones drop frame-advance work.
 */
export const FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW = 15;

export type FieldSpriteAnimInput = {
  readonly cellRow: number;
  readonly reduceMotion: boolean;
  readonly appBackground?: boolean;
  readonly frameCount: number;
};

/** Whether a field sprite should advance spritesheet frames (P4-S7). */
export function shouldAnimateFieldSprite(input: FieldSpriteAnimInput | number): boolean {
  if (typeof input === 'number') {
    return input < FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW;
  }
  if (input.reduceMotion || input.appBackground === true) {
    return false;
  }
  if (input.frameCount < 2) {
    return false;
  }
  return input.cellRow < FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW;
}
