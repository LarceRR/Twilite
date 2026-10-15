import { create } from 'zustand';

import {
  type FieldConfig,
  type FieldConfigOverrides,
  mergeFieldConfig,
} from './fieldConfig';

export type FieldConfigState = {
  readonly overrides: FieldConfigOverrides;
  patchOverrides: (patch: FieldConfigOverrides) => void;
  setSection: <K extends keyof FieldConfig>(
    section: K,
    patch: NonNullable<FieldConfigOverrides[K]>,
  ) => void;
  hydrate: (overrides: FieldConfigOverrides) => void;
  reset: () => void;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Recursively merge object patches so editing one nested setting preserves its siblings. */
function mergeNested(current: unknown, patch: unknown): unknown {
  if (!isPlainObject(current) || !isPlainObject(patch)) return patch;

  const next: Record<string, unknown> = { ...current };
  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === undefined) continue;
    next[key] = mergeNested(current[key], patchValue);
  }
  return next;
}

function mergeOverrides(
  current: FieldConfigOverrides,
  patch: FieldConfigOverrides,
): FieldConfigOverrides {
  return mergeNested(current, patch) as FieldConfigOverrides;
}

export const useFieldConfigStore = create<FieldConfigState>()((set) => ({
  overrides: {},
  patchOverrides: (patch) =>
    set((state) => ({ overrides: mergeOverrides(state.overrides, patch) })),
  setSection: (section, patch) =>
    set((state) => ({
      overrides: mergeOverrides(state.overrides, { [section]: patch }),
    })),
  hydrate: (overrides) => set({ overrides: overrides ?? {} }),
  reset: () => set({ overrides: {} }),
}));

export function persistedFieldConfigOverrides(
  state: Pick<FieldConfigState, 'overrides'>,
): FieldConfigOverrides {
  return state.overrides;
}

export function selectFieldConfig(state: FieldConfigState): FieldConfig {
  return mergeFieldConfig(state.overrides);
}

/** Non-React access to the merged Field Space config. */
export function getFieldConfig(): FieldConfig {
  return mergeFieldConfig(useFieldConfigStore.getState().overrides);
}
