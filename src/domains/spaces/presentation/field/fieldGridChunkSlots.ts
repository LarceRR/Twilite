import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';

/** Max simultaneous chunk meshes: behind + anchor + ahead. */
export function fieldChunkSlotCount(
  behind?: number,
  ahead?: number,
): number {
  const chunks = getFieldConfig().chunks;
  return (behind ?? chunks.behind) + (ahead ?? chunks.ahead) + 1;
}

/**
 * Reuse slot indices for chunk ids that stay in the window so React keys stay
 * stable and meshes/materials are not torn down on every scroll step.
 */
export function assignFieldChunkSlots(
  desired: readonly number[],
  previousSlots: readonly (number | null)[],
  slotCount: number = fieldChunkSlotCount(),
): readonly (number | null)[] {
  const next: (number | null)[] = Array.from({ length: slotCount }, () => null);
  const kept = new Set<number>();

  for (let i = 0; i < slotCount; i += 1) {
    const prev = previousSlots[i] ?? null;
    if (prev == null || !desired.includes(prev)) continue;
    next[i] = prev;
    kept.add(prev);
  }

  let cursor = 0;
  for (const id of desired) {
    if (kept.has(id)) continue;
    while (cursor < slotCount && next[cursor] != null) cursor += 1;
    if (cursor >= slotCount) break;
    next[cursor] = id;
    cursor += 1;
  }

  return next;
}

export function fieldChunkSlotsEqual(
  a: readonly (number | null)[],
  b: readonly (number | null)[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Default slot count from compile-time defaults (for specs / static math). */
export const FIELD_CHUNK_SLOT_COUNT_DEFAULT =
  DEFAULT_FIELD_CONFIG.chunks.behind + DEFAULT_FIELD_CONFIG.chunks.ahead + 1;
