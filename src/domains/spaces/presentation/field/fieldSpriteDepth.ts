import type { Cell } from '@/domains/surface-objects/domain/value-objects/Cell';

/** Row 0 is nearest the camera; higher `zIndex` draws on top. */
export function fieldSpriteZIndex(cell: Cell): number {
  return 10_000 - cell.y * 100 + cell.x;
}

export function compareFieldSpritesBackToFront(
  a: { readonly cell: Cell },
  b: { readonly cell: Cell },
): number {
  if (a.cell.y !== b.cell.y) {
    return b.cell.y - a.cell.y;
  }
  return a.cell.x - b.cell.x;
}
