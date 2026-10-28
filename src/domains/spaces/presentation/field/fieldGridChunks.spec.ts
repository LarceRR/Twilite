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
  fieldChunkOccupiedCellKeys,
  fieldChunkOccupiedCellsSignature,
  fieldChunkPlanePosition,
  fieldChunkStreamingLookAheadPx,
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

  it('keeps occupancy signatures and keys local to their chunk', () => {
    const occupiedCells = new Set(['0:0', '3:2', '10:0', '14:2']);
    const firstSignature = fieldChunkOccupiedCellsSignature(0, 10, 15, occupiedCells);
    const secondSignature = fieldChunkOccupiedCellsSignature(1, 10, 15, occupiedCells);

    expect(firstSignature).toBe('0:0,3:2');
    expect(secondSignature).toBe('0:0,4:2');
    expect([...fieldChunkOccupiedCellKeys(0, 10, firstSignature)]).toEqual(['0:0', '3:2']);
    expect([...fieldChunkOccupiedCellKeys(1, 10, secondSignature)]).toEqual(['10:0', '14:2']);
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
    // focus ≈ cameraX + 500 → at x=700 focus=1200 → col 20 → chunk 2
    expect(fieldChunkIndicesForCameraX(700, cellSize)).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not unload the physical camera chunk when the focus trigger advances', () => {
    const cameraX = 420;
    const cameraChunk = fieldChunkIndexFromWorldX(cameraX, cellSize);
    const mounted = fieldChunkIndicesForCameraX(cameraX, cellSize);

    // The former 780-unit look-ahead advanced focus into chunk 2 while the
    // camera was still in chunk 0, causing that chunk to disappear too early.
    expect(cameraChunk).toBe(0);
    expect(mounted).toContain(cameraChunk);
  });
  it('caps a legacy look-ahead before the physical camera chunk is evicted', () => {
    expect(fieldChunkStreamingLookAheadPx(780, cellSize, 10)).toBe(599);
    const cameraChunk = fieldChunkIndexFromWorldX(420, cellSize);
    const mounted = fieldChunkIndicesForCameraX(420, cellSize, 10, 780);
    expect(mounted).toContain(cameraChunk);
  });
  it('places chunk meshes on absolute world X', () => {
    const spec = createFieldGridChunkSpec(1, { rows: 15, cellSize });
    expect(spec.colStart).toBe(10);
    expect(fieldChunkPlanePosition(spec)).toEqual([915, 0, 0]);
  });

  it('compares chunk id lists', () => {
    expect(fieldChunkConfigsEqual([0, 1], [0, 1])).toBe(true);
    expect(fieldChunkConfigsEqual([0, 1], [0, 2])).toBe(false);
  });
});
