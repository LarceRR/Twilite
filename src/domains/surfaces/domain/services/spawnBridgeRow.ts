import {
  type Cell,
  cellKey,
} from '@/domains/surface-objects/domain/value-objects/Cell';

export const BRIDGE_COLUMN_COUNT = 5;
export const BRIDGE_CENTER_COLUMN = 2;

type RandomSource = () => number;

/** The object furthest along the bridge (highest row; latest wins ties). */
function frontmostCell(cells: readonly Cell[]): Cell | undefined {
  let best: Cell | undefined;
  for (const cell of cells) {
    if (best === undefined || cell.y >= best.y) {
      best = cell;
    }
  }
  return best;
}

/**
 * Next cell on the bridge: one row past the anchor, never in the anchor's
 * column, never on an occupied cell.
 *
 * Fixed edge cases:
 * - `lastCreated` missing on a non-empty bridge used to return row 0 centre,
 *   which is almost always occupied. Now the frontmost object is the anchor.
 * - A full next row used to fall back to the centre cell even if it was taken.
 *   Now it walks forward until a free cell exists.
 */
export function spawnBridgeRow(options: {
  readonly occupied: readonly Cell[];
  readonly random: RandomSource;
  readonly lastCreated?: Cell;
}): Cell {
  const anchor = options.lastCreated ?? frontmostCell(options.occupied);

  if (options.occupied.length === 0 || anchor === undefined) {
    return { x: BRIDGE_CENTER_COLUMN, y: 0 };
  }

  const taken = new Set(options.occupied.map(cellKey));
  const forbidden = anchor.x;
  const columns = Array.from({ length: BRIDGE_COLUMN_COUNT }, (_, index) => index).filter(
    (column) => column !== forbidden,
  );

  const shuffled = [...columns];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(options.random() * (index + 1));
    const current = shuffled[index];
    const target = shuffled[swap];
    if (current === undefined || target === undefined) {
      continue;
    }
    shuffled[index] = target;
    shuffled[swap] = current;
  }

  // The "not the same column" rule is a preference for the very next row only.
  const laterOrder =
    forbidden >= 0 && forbidden < BRIDGE_COLUMN_COUNT ? [...shuffled, forbidden] : shuffled;
  const firstRow = anchor.y + 1;
  // Finite occupancy: some row within this range is guaranteed to have a hole.
  const lastRow = firstRow + options.occupied.length;

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (const column of row === firstRow ? shuffled : laterOrder) {
      const candidate = { x: column, y: row };
      if (!taken.has(cellKey(candidate))) {
        return candidate;
      }
    }
  }

  return { x: BRIDGE_CENTER_COLUMN, y: lastRow + 1 };
}
