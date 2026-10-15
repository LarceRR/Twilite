import { create } from 'zustand';

export type FieldTilePreferences = {
  readonly generatedTilesEnabled: boolean;
  readonly worldSeed: string;
  readonly tileMinHeight: number;
  readonly tileMaxHeight: number;
  readonly objectMinHeight: number;
  readonly objectMaxHeight: number;
};

type LegacyFieldTilePreferences = {
  readonly inactiveMinHeight?: number;
  readonly inactiveMaxHeight?: number;
  readonly activeMinHeight?: number;
  readonly activeMaxHeight?: number;
};

export type FieldTileState = FieldTilePreferences & {
  readonly setOption: <K extends keyof FieldTilePreferences>(
    key: K,
    value: FieldTilePreferences[K],
  ) => void;
  readonly hydrate: (
    preferences: Partial<FieldTilePreferences> & LegacyFieldTilePreferences,
  ) => void;
  readonly reset: () => void;
};

export const DEFAULT_FIELD_TILE_SETTINGS: FieldTilePreferences = {
  generatedTilesEnabled: true,
  worldSeed: 'twilite-world-001',
  tileMinHeight: 0,
  tileMaxHeight: 3,
  objectMinHeight: 7,
  objectMaxHeight: 10,
};

function clampInteger(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : min;
}

function normalizePreferences(
  current: FieldTilePreferences,
  patch: Partial<FieldTilePreferences>,
): FieldTilePreferences {
  const next = { ...current, ...patch };
  const tileA = clampInteger(next.tileMinHeight, 0, 3);
  const tileB = clampInteger(next.tileMaxHeight, 0, 3);
  const tileMinHeight = Math.min(tileA, tileB);
  const tileMaxHeight = Math.max(tileA, tileB);
  const minimumObjectHeight = tileMaxHeight * 2 + 1;
  const objectA = clampInteger(next.objectMinHeight, minimumObjectHeight, 24);
  const objectB = clampInteger(next.objectMaxHeight, minimumObjectHeight, 24);

  return {
    generatedTilesEnabled:
      typeof next.generatedTilesEnabled === 'boolean'
        ? next.generatedTilesEnabled
        : current.generatedTilesEnabled,
    worldSeed:
      typeof next.worldSeed === 'string' && next.worldSeed.trim().length > 0
        ? next.worldSeed.trim().slice(0, 128)
        : current.worldSeed,
    tileMinHeight,
    tileMaxHeight,
    objectMinHeight: Math.min(objectA, objectB),
    objectMaxHeight: Math.max(objectA, objectB),
  };
}

export const useFieldTileStore = create<FieldTileState>()((set) => ({
  ...DEFAULT_FIELD_TILE_SETTINGS,
  setOption: (key, value) =>
    set((state) => normalizePreferences(state, { [key]: value } as Partial<FieldTilePreferences>)),
  hydrate: (preferences) =>
    set((state) => {
      // Migrate preferences saved before the tile/object height ranges were separated.
      const legacy = preferences as Partial<FieldTilePreferences> & LegacyFieldTilePreferences;
      const migrated: Partial<FieldTilePreferences> = {
        ...legacy,
        tileMinHeight: legacy.tileMinHeight ?? legacy.inactiveMinHeight,
        tileMaxHeight: legacy.tileMaxHeight ?? legacy.inactiveMaxHeight,
        objectMinHeight: legacy.objectMinHeight ?? legacy.activeMinHeight,
        objectMaxHeight: legacy.objectMaxHeight ?? legacy.activeMaxHeight,
      };
      return normalizePreferences(state, migrated);
    }),
  reset: () => set({ ...DEFAULT_FIELD_TILE_SETTINGS }),
}));

export function persistedFieldTilePreferences(state: FieldTileState): FieldTilePreferences {
  return {
    generatedTilesEnabled: state.generatedTilesEnabled,
    worldSeed: state.worldSeed,
    tileMinHeight: state.tileMinHeight,
    tileMaxHeight: state.tileMaxHeight,
    objectMinHeight: state.objectMinHeight,
    objectMaxHeight: state.objectMaxHeight,
  };
}
