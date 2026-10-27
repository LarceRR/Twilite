import { describe, expect, it } from 'vitest';

import { generateFieldGrassInstances } from './fieldGrassGeneration';
import { fieldGridWorldSize } from './fieldGridConfig';

const grid = {
  rows: 15,
  cellSize: 60,
  dividerWidth: 1,
};

function options(chunkIndex: number, occupiedCellKeys: ReadonlySet<string> = new Set()) {
  return {
    chunkIndex,
    chunkCols: 10,
    grid,
    worldSeed: 'grass-test-world',
    tileMinHeight: 0,
    tileMaxHeight: 3,
    platformHeight: 6,
    generatedTilesEnabled: true,
    occupiedCellKeys,
  };
}

describe('continuous field grass generation', () => {
  it('generates a continuous distribution denser than the logical cell grid', () => {
    const instances = generateFieldGrassInstances(options(0));
    expect(instances.length).toBeGreaterThan(grid.rows * 10);
    expect(instances.every((instance) => instance.width > 0 && instance.height > 0)).toBe(true);
  });

  it('keeps instance positions deterministic across calls', () => {
    expect(generateFieldGrassInstances(options(3))).toEqual(
      generateFieldGrassInstances(options(3)),
    );
  });

  it('keeps the global lattice aligned across adjacent chunks without duplicate roots', () => {
    const first = generateFieldGrassInstances(options(0));
    const second = generateFieldGrassInstances(options(1));
    const chunkWidth = fieldGridWorldSize({
      cols: 10,
      ...grid,
      showDividers: false,
    }).width;

    expect(first.every((instance) => instance.x >= 0 && instance.x < chunkWidth)).toBe(true);
    expect(second.every((instance) => instance.x >= chunkWidth && instance.x < chunkWidth * 2)).toBe(true);

    const positions = new Set(
      [...first, ...second].map((instance) => instance.x + ':' + instance.y),
    );
    expect(positions.size).toBe(first.length + second.length);
  });

  it('leaves occupied memory cells unobscured without using cells as grass spawn points', () => {
    const occupied = generateFieldGrassInstances(options(0, new Set(['0:0'])));
    const surfaceHeight = fieldGridWorldSize({
      cols: 10,
      ...grid,
      showDividers: false,
    }).height;
    const pitch = grid.cellSize + grid.dividerWidth;

    expect(
      occupied.every((instance) => {
        const col = Math.floor(instance.x / pitch);
        const row = Math.floor((surfaceHeight / 2 - instance.y) / pitch);
        return col !== 0 || row !== 0;
      }),
    ).toBe(true);
  });
});
