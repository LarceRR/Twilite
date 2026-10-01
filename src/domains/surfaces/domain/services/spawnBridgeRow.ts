import {
  type Cell,
  cellKey,
} from '@/domains/surface-objects/domain/value-objects/Cell';

export const BRIDGE_COLUMN_COUNT = 5;
export const BRIDGE_CENTER_COLUMN = 2;

type RandomSource = () => number;

export function spawnBridgeRow(options: {
  readonly occupied: readonly Cell[];
  readonly random: RandomSource;
  readonly lastCreated?: Cell;
}): Cell {
  const taken = new Set(options.occupied.map(cellKey));

  if (options.occupied.length === 0) {
    return { x: BRIDGE_CENTER_COLUMN, y: 0 };
  }

  if (options.lastCreated === undefined) {
    return { x: BRIDGE_CENTER_COLUMN, y: 0 };
  }

  const row = options.lastCreated.y + 1;
  const forbidden = options.lastCreated.x;
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

  for (const column of shuffled) {
    const candidate = { x: column, y: row };
    if (!taken.has(cellKey(candidate))) {
      return candidate;
    }
  }

  return { x: BRIDGE_CENTER_COLUMN, y: row };
}
