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
  readonly textureUri: string | null;
  readonly setTextureUri: (uri: string | null) => void;
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

const TILE_HEIGHT_MIN = 0;
const TILE_HEIGHT_MAX = 100;

function clampInteger(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : min;
}

/** Every height control has an independent 0..100 range, without cross-field constraints. */
function normalizePreferences(
  current: FieldTilePreferences,
  patch: Partial<FieldTilePreferences>,
): FieldTilePreferences {
  const next = { ...current, ...patch };

  return {
    generatedTilesEnabled:
      typeof next.generatedTilesEnabled === 'boolean'
        ? next.generatedTilesEnabled
        : current.generatedTilesEnabled,
    worldSeed:
      typeof next.worldSeed === 'string' && next.worldSeed.trim().length > 0
        ? next.worldSeed.trim().slice(0, 128)
        : current.worldSeed,
    tileMinHeight: clampInteger(next.tileMinHeight, TILE_HEIGHT_MIN, TILE_HEIGHT_MAX),
    tileMaxHeight: clampInteger(next.tileMaxHeight, TILE_HEIGHT_MIN, TILE_HEIGHT_MAX),
    objectMinHeight: clampInteger(next.objectMinHeight, TILE_HEIGHT_MIN, TILE_HEIGHT_MAX),
    objectMaxHeight: clampInteger(next.objectMaxHeight, TILE_HEIGHT_MIN, TILE_HEIGHT_MAX),
  };
}

export const useFieldTileStore = create<FieldTileState>()((set) => ({
  ...DEFAULT_FIELD_TILE_SETTINGS,
  textureUri: null,
  setTextureUri: (uri) =>
    set({ textureUri: typeof uri === 'string' && uri.trim().length > 0 ? uri : null }),
  setOption: (key, value) =>
    set((state) => normalizePreferences(state, { [key]: value } as Partial<FieldTilePreferences>)),
  hydrate: (preferences) =>
    set((state) => {
      // Migrate preferences saved before the tile/object height ranges were separated.
      const legacy = preferences as Partial<FieldTilePreferences> & LegacyFieldTilePreferences;
      const tileMinHeight = legacy.tileMinHeight ?? legacy.inactiveMinHeight;
      const tileMaxHeight = legacy.tileMaxHeight ?? legacy.inactiveMaxHeight;
      const objectMinHeight = legacy.objectMinHeight ?? legacy.activeMinHeight;
      const objectMaxHeight = legacy.objectMaxHeight ?? legacy.activeMaxHeight;
      const migrated: Partial<FieldTilePreferences> = {
        ...(legacy.generatedTilesEnabled === undefined
          ? {}
          : { generatedTilesEnabled: legacy.generatedTilesEnabled }),
        ...(legacy.worldSeed === undefined ? {} : { worldSeed: legacy.worldSeed }),
        ...(tileMinHeight === undefined ? {} : { tileMinHeight }),
        ...(tileMaxHeight === undefined ? {} : { tileMaxHeight }),
        ...(objectMinHeight === undefined ? {} : { objectMinHeight }),
        ...(objectMaxHeight === undefined ? {} : { objectMaxHeight }),
      };
      return normalizePreferences(state, migrated);
    }),
  reset: () => set({ ...DEFAULT_FIELD_TILE_SETTINGS, textureUri: null }),
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
