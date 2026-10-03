import { describe, expect, it } from 'vitest';

import {
  FIELD_CHUNK_AHEAD,
  FIELD_CHUNK_BEHIND,
  FIELD_CHUNK_COLS,
  createFieldGridChunkSpec,
  fieldChunkColStart,
  fieldChunkConfigsEqual,
  fieldChunkFocusWorldX,
  fieldChunkIndexFromWorldX,
  fieldChunkIndicesForCameraX,
  fieldChunkPlanePosition,
  fieldVisibleChunkIndices,
} from './fieldGridChunks';

describe('fieldGridChunks', () => {
  const cellSize = 60;

  it('maps world X to non-negative chunk indices', () => {
    expect(FIELD_CHUNK_COLS).toBe(10);
    expect(fieldChunkIndexFromWorldX(-100, cellSize)).toBe(0);
    expect(fieldChunkIndexFromWorldX(0, cellSize)).toBe(0);
    expect(fieldChunkIndexFromWorldX(599, cellSize)).toBe(0);
    expect(fieldChunkIndexFromWorldX(600, cellSize)).toBe(1);
    expect(fieldChunkColStart(2)).toBe(20);
  });

  it('keeps a behind/ahead window around the camera focus', () => {
    expect(FIELD_CHUNK_BEHIND).toBe(1);
    expect(FIELD_CHUNK_AHEAD).toBe(3);
    expect(fieldVisibleChunkIndices(0)).toEqual([0, 1, 2, 3]);
    expect(fieldVisibleChunkIndices(3)).toEqual([2, 3, 4, 5, 6]);
  });

  it('loads the first chunks from the default camera X', () => {
    const ids = fieldChunkIndicesForCameraX(-469, cellSize);
    expect(ids).toEqual([0, 1, 2, 3]);
    expect(fieldChunkFocusWorldX(-469)).toBeGreaterThan(0);
  });

  it('advances the window as the camera moves +X', () => {
    // focus ≈ cameraX + 780 → at x=700 focus=1480 → col 24 → chunk 2
    expect(fieldChunkIndicesForCameraX(700, cellSize)).toEqual([1, 2, 3, 4, 5]);
  });

  it('places chunk meshes on absolute world X', () => {
    const spec = createFieldGridChunkSpec(1, { rows: 15, cellSize });
    expect(spec.colStart).toBe(10);
    expect(fieldChunkPlanePosition(spec)).toEqual([900, 0, 0]);
  });

  it('compares chunk id lists', () => {
    expect(fieldChunkConfigsEqual([0, 1], [0, 1])).toBe(true);
    expect(fieldChunkConfigsEqual([0, 1], [0, 2])).toBe(false);
  });
});
