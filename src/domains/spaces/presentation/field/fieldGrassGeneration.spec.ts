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
    objectMinHeight: 7,
    objectMaxHeight: 10,
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

  it('matches the author’s approximate 48 blades per square metre without density inflation', () => {
    const instances = generateFieldGrassInstances(options(0));
    const surface = fieldGridWorldSize({
      cols: 10,
      ...grid,
      showDividers: false,
    });
    const areaSquareMetres = (surface.width / 100) * (surface.height / 100);
    const density = instances.length / areaSquareMetres;

    expect(density).toBeGreaterThan(35);
    expect(density).toBeLessThan(55);
    expect(instances.every((instance) => instance.width === 20 && instance.height === 30)).toBe(true);
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

  it('keeps grass continuous in occupied cells with only a local clearance around the object', () => {
    const occupied = generateFieldGrassInstances(options(0, new Set(['0:0'])));
    const surfaceHeight = fieldGridWorldSize({
      cols: 10,
      ...grid,
      showDividers: false,
    }).height;
    const pitch = grid.cellSize + grid.dividerWidth;
    const inOccupiedCell = occupied.filter((instance) => {
      const col = Math.floor(instance.x / pitch);
      const row = Math.floor((surfaceHeight / 2 - instance.y) / pitch);
      return col === 0 && row === 0;
    });
    const centerX = grid.dividerWidth + grid.cellSize / 2;
    const centerY = surfaceHeight / 2 - grid.dividerWidth - grid.cellSize / 2;
    const clearance = grid.cellSize * 0.28;

    expect(inOccupiedCell.length).toBeGreaterThan(0);
    expect(inOccupiedCell.every((instance) => instance.rootZ >= 7 && instance.rootZ <= 10)).toBe(true);
    expect(inOccupiedCell.every((instance) => {
      const dx = instance.x - centerX;
      const dy = instance.y - centerY;
      return dx * dx + dy * dy >= clearance * clearance;
    })).toBe(true);
  });
});
