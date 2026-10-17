import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_FIELD_TILE_SETTINGS,
  persistedFieldTilePreferences,
  useFieldTileStore,
} from './fieldTileStore';

describe('fieldTileStore', () => {
  beforeEach(() => {
    useFieldTileStore.getState().reset();
  });

  it('keeps separate height controls independently configurable from 0 to 100', () => {
    useFieldTileStore.getState().setOption('worldSeed', 'stable-world');
    useFieldTileStore.getState().setOption('tileMinHeight', 100);
    useFieldTileStore.getState().setOption('tileMaxHeight', 0);
    useFieldTileStore.getState().setOption('objectMinHeight', 87);
    useFieldTileStore.getState().setOption('objectMaxHeight', 2);

    expect(persistedFieldTilePreferences(useFieldTileStore.getState())).toMatchObject({
      worldSeed: 'stable-world',
      tileMinHeight: 100,
      tileMaxHeight: 0,
      objectMinHeight: 87,
      objectMaxHeight: 2,
    });
  });

  it('clamps values outside the supported slider range', () => {
    useFieldTileStore.getState().setOption('tileMinHeight', -20);
    useFieldTileStore.getState().setOption('tileMaxHeight', 120);
    useFieldTileStore.getState().setOption('objectMinHeight', -1);
    useFieldTileStore.getState().setOption('objectMaxHeight', 101);

    expect(useFieldTileStore.getState()).toMatchObject({
      tileMinHeight: 0,
      tileMaxHeight: 100,
      objectMinHeight: 0,
      objectMaxHeight: 100,
    });
  });

  it('migrates previously saved seed and height options', () => {
    useFieldTileStore.getState().hydrate({
      worldSeed: 'old-seed',
      generatedTilesEnabled: true,
      inactiveMinHeight: 1,
      inactiveMaxHeight: 2,
      activeMinHeight: 6,
      activeMaxHeight: 9,
    });

    expect(useFieldTileStore.getState()).toMatchObject({
      worldSeed: 'old-seed',
      tileMinHeight: 1,
      tileMaxHeight: 2,
      objectMinHeight: 6,
      objectMaxHeight: 9,
    });
  });

  it('stores one shared texture URI separately from numerical settings', () => {
    useFieldTileStore.getState().setTextureUri('file:///tiles/custom.png');

    expect(useFieldTileStore.getState().textureUri).toBe('file:///tiles/custom.png');
    expect(persistedFieldTilePreferences(useFieldTileStore.getState())).not.toHaveProperty('textureUri');
  });

  it('uses the expected initial configuration', () => {
    expect(DEFAULT_FIELD_TILE_SETTINGS.tileMinHeight).toBe(0);
    expect(DEFAULT_FIELD_TILE_SETTINGS.tileMaxHeight).toBe(3);
    expect(DEFAULT_FIELD_TILE_SETTINGS.objectMinHeight).toBeGreaterThan(
      DEFAULT_FIELD_TILE_SETTINGS.tileMaxHeight * 2,
    );
  });
});
