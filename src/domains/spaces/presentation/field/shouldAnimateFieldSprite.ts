/**
 * Bridge rows at or after this index keep a static preview frame.
 * Near rows stay animated; distant ones drop frame-advance work.
 */
export const FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW = 15;

/** Whether a field sprite at `cell.y` should advance spritesheet frames. */
export function shouldAnimateFieldSprite(cellRow: number): boolean {
  return cellRow < FIELD_SPRITE_ANIM_MAX_EXCLUSIVE_ROW;
}
