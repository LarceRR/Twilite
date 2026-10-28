import { describe, expect, it } from 'vitest';

import {
  fieldGrassOccupiedCellKeysSignature,
  generateFieldGrassInstances,
  iterateFieldGrassInstances,
} from './fieldGrassGeneration';
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

  it('keeps the configured default density around 30 blades per square metre', () => {
    const instances = generateFieldGrassInstances(options(0));
    const surface = fieldGridWorldSize({
      cols: 10,
      ...grid,
      showDividers: false,
    });
    const areaSquareMetres = (surface.width / 100) * (surface.height / 100);
    const density = instances.length / areaSquareMetres;

    expect(density).toBeGreaterThan(25);
    expect(density).toBeLessThan(35);
    expect(instances.every((instance) => instance.width === 20 && instance.height === 30)).toBe(true);
  });

  it('distributes dense grass across the whole chunk when the instance limit is reached', () => {
    const instances = generateFieldGrassInstances({
      ...options(0),
      spacing: 5,
      maxInstances: 400,
    });
    const surface = fieldGridWorldSize({ cols: 10, ...grid, showDividers: false });

    expect(instances.length).toBeGreaterThan(250);
    expect(instances.length).toBeLessThanOrEqual(400);
    expect(Math.min(...instances.map((instance) => instance.x))).toBeLessThan(surface.width * 0.1);
    expect(Math.max(...instances.map((instance) => instance.x))).toBeGreaterThan(surface.width * 0.9);
    expect(Math.min(...instances.map((instance) => instance.y))).toBeLessThan(-surface.height * 0.4);
    expect(Math.max(...instances.map((instance) => instance.y))).toBeGreaterThan(surface.height * 0.4);
  });

  it('uses the instance budget without leaving periodic gaps in the grass lattice', () => {
    const maxInstances = 1000;
    const instances = generateFieldGrassInstances({
      ...options(0),
      spacing: 4,
      maxInstances,
    });
    const surface = fieldGridWorldSize({ cols: 10, ...grid, showDividers: false });

    expect(instances.length).toBeGreaterThan(maxInstances * 0.8);
    expect(instances.length).toBeLessThanOrEqual(maxInstances);
    const xBins = Array.from({ length: 10 }, (_, bin) =>
      instances.filter((instance) =>
        instance.x >= (surface.width * bin) / 10 &&
        instance.x < (surface.width * (bin + 1)) / 10,
      ).length,
    );
    const yBins = Array.from({ length: 10 }, (_, bin) =>
      instances.filter((instance) =>
        instance.y >= -surface.height / 2 + (surface.height * bin) / 10 &&
        instance.y < -surface.height / 2 + (surface.height * (bin + 1)) / 10,
      ).length,
    );

    expect(xBins.every((count) => count > 0)).toBe(true);
    expect(yBins.every((count) => count > 0)).toBe(true);
  });

  it('samples the whole chunk instead of exhausting the instance budget in one strip', () => {
    const instances = generateFieldGrassInstances({
      ...options(0),
      spacing: 4,
      maxInstances: 1200,
    });
    const surface = fieldGridWorldSize({ cols: 10, ...grid, showDividers: false });
    const xBins = Array.from({ length: 8 }, (_, bin) =>
      instances.filter((instance) =>
        instance.x >= (surface.width * bin) / 8 &&
        instance.x < (surface.width * (bin + 1)) / 8,
      ).length,
    );
    const yBins = Array.from({ length: 8 }, (_, bin) =>
      instances.filter((instance) =>
        instance.y >= -surface.height / 2 + (surface.height * bin) / 8 &&
        instance.y < -surface.height / 2 + (surface.height * (bin + 1)) / 8,
      ).length,
    );

    expect(instances.length).toBeLessThanOrEqual(1200);
    expect(xBins.every((count) => count > 0)).toBe(true);
    expect(yBins.every((count) => count > 0)).toBe(true);
    expect(Math.max(...xBins)).toBeLessThan(Math.min(...xBins) * 3);
    expect(Math.max(...yBins)).toBeLessThan(Math.min(...yBins) * 3);
  });

  it('keeps occupied-cell inputs for an existing chunk stable when another chunk loads', () => {
    const before = new Set(['1:3', '5:4']);
    const after = new Set(['1:3', '5:4', '11:8']);

    expect(fieldGrassOccupiedCellKeysSignature(before, 0, 10)).toBe(
      fieldGrassOccupiedCellKeysSignature(after, 0, 10),
    );
    expect(fieldGrassOccupiedCellKeysSignature(after, 1, 10)).toBe('11:8');
    expect(fieldGrassOccupiedCellKeysSignature(after, 0, 10)).toBe(
      fieldGrassOccupiedCellKeysSignature(new Set(['5:4', '1:3']), 0, 10),
    );
  });

  it('supports adjustable density and blade dimensions', () => {
    const defaultInstances = generateFieldGrassInstances(options(0));
    const adjustedInstances = generateFieldGrassInstances({
      ...options(0),
      spacing: 24,
      bladeWidth: 9,
      bladeHeight: 21,
    });

    expect(adjustedInstances.length).toBeLessThan(defaultInstances.length);
    expect(adjustedInstances.every((instance) => instance.width === 9 && instance.height === 21)).toBe(true);
  });

  it('allows work to be consumed incrementally without changing generated results', () => {
    const expected = generateFieldGrassInstances(options(2));
    const actual = Array.from(iterateFieldGrassInstances(options(2)));
    expect(actual).toEqual(expected);
  });

  it('keeps instance positions deterministic across calls', () => {
    expect(generateFieldGrassInstances(options(3))).toEqual(
      generateFieldGrassInstances(options(3)),
    );
  });

  it('keeps the budgeted global lattice aligned across adjacent chunks without duplicate roots', () => {
    const budget = { spacing: 4, maxInstances: 1000 };
    const first = generateFieldGrassInstances({ ...options(0), ...budget });
    const second = generateFieldGrassInstances({ ...options(1), ...budget });
    const chunkWidth = fieldGridWorldSize({
      cols: 10,
      ...grid,
      showDividers: false,
    }).width;

    expect(first.every((instance) => instance.x >= 0 && instance.x < chunkWidth)).toBe(true);
    expect(second.every((instance) => instance.x >= chunkWidth && instance.x < chunkWidth * 2)).toBe(true);
    expect(
      Math.min(...second.map((instance) => instance.x)) -
        Math.max(...first.map((instance) => instance.x)),
    ).toBeLessThan(grid.cellSize);

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
