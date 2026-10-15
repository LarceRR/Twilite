import { create } from 'zustand';

export type FieldTilePreferences = {
  readonly generatedTilesEnabled: boolean;
  readonly worldSeed: string;
  readonly inactiveMinHeight: number;
  readonly inactiveMaxHeight: number;
  readonly activeMinHeight: number;
  readonly activeMaxHeight: number;
};

export type FieldTileState = FieldTilePreferences & {
  readonly setOption: <K extends keyof FieldTilePreferences>(
    key: K,
    value: FieldTilePreferences[K],
  ) => void;
  readonly hydrate: (preferences: Partial<FieldTilePreferences>) => void;
  readonly reset: () => void;
};

export const DEFAULT_FIELD_TILE_SETTINGS: FieldTilePreferences = {
  generatedTilesEnabled: true,
  worldSeed: 'twilite-world-001',
  inactiveMinHeight: 0,
  inactiveMaxHeight: 3,
  activeMinHeight: 6,
  activeMaxHeight: 9,
};

function clampInteger(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : min;
}

function normalizePreferences(
  current: FieldTilePreferences,
  patch: Partial<FieldTilePreferences>,
): FieldTilePreferences {
  const next = { ...current, ...patch };
  const inactiveA = clampInteger(next.inactiveMinHeight, 0, 3);
  const inactiveB = clampInteger(next.inactiveMaxHeight, 0, 3);
  const activeA = clampInteger(next.activeMinHeight, 1, 24);
  const activeB = clampInteger(next.activeMaxHeight, 1, 24);

  return {
    generatedTilesEnabled:
      typeof next.generatedTilesEnabled === 'boolean'
        ? next.generatedTilesEnabled
        : current.generatedTilesEnabled,
    worldSeed:
      typeof next.worldSeed === 'string' && next.worldSeed.trim().length > 0
        ? next.worldSeed.trim().slice(0, 128)
        : current.worldSeed,
    inactiveMinHeight: Math.min(inactiveA, inactiveB),
    inactiveMaxHeight: Math.max(inactiveA, inactiveB),
    activeMinHeight: Math.min(activeA, activeB),
    activeMaxHeight: Math.max(activeA, activeB),
  };
}

export const useFieldTileStore = create<FieldTileState>()((set) => ({
  ...DEFAULT_FIELD_TILE_SETTINGS,
  setOption: (key, value) =>
    set((state) => normalizePreferences(state, { [key]: value } as Partial<FieldTilePreferences>)),
  hydrate: (preferences) =>
    set((state) => normalizePreferences(state, preferences ?? {})),
  reset: () => set({ ...DEFAULT_FIELD_TILE_SETTINGS }),
}));

export function persistedFieldTilePreferences(state: FieldTileState): FieldTilePreferences {
  return {
    generatedTilesEnabled: state.generatedTilesEnabled,
    worldSeed: state.worldSeed,
    inactiveMinHeight: state.inactiveMinHeight,
    inactiveMaxHeight: state.inactiveMaxHeight,
    activeMinHeight: state.activeMinHeight,
    activeMaxHeight: state.activeMaxHeight,
  };
}
