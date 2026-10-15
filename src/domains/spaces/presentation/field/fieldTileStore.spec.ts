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

  it('persists one tile range and a separate object-platform range', () => {
    useFieldTileStore.getState().setOption('worldSeed', 'stable-world');
    useFieldTileStore.getState().setOption('tileMinHeight', 1);
    useFieldTileStore.getState().setOption('tileMaxHeight', 2);
    useFieldTileStore.getState().setOption('objectMinHeight', 6);
    useFieldTileStore.getState().setOption('objectMaxHeight', 8);

    expect(persistedFieldTilePreferences(useFieldTileStore.getState())).toMatchObject({
      worldSeed: 'stable-world',
      tileMinHeight: 1,
      tileMaxHeight: 2,
      objectMinHeight: 6,
      objectMaxHeight: 8,
    });
  });

  it('always keeps object platforms above the regular tile range', () => {
    useFieldTileStore.getState().setOption('tileMaxHeight', 3);
    useFieldTileStore.getState().setOption('objectMinHeight', 1);

    const state = useFieldTileStore.getState();
    expect(state.objectMinHeight).toBeGreaterThan(state.tileMaxHeight * 2);
    expect(state.objectMaxHeight).toBeGreaterThanOrEqual(state.objectMinHeight);
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

  it('uses the expected initial configuration', () => {
    expect(DEFAULT_FIELD_TILE_SETTINGS.tileMinHeight).toBe(0);
    expect(DEFAULT_FIELD_TILE_SETTINGS.tileMaxHeight).toBe(3);
    expect(DEFAULT_FIELD_TILE_SETTINGS.objectMinHeight).toBeGreaterThan(
      DEFAULT_FIELD_TILE_SETTINGS.tileMaxHeight * 2,
    );
  });
});
