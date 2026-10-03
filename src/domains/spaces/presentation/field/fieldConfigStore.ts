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

function assignSection<K extends keyof FieldConfigOverrides>(
  target: FieldConfigOverrides,
  key: K,
  value: FieldConfigOverrides[K] | undefined,
): void {
  if (value === undefined) {
    delete (target as Record<string, unknown>)[key];
    return;
  }
  (target as Record<K, NonNullable<FieldConfigOverrides[K]>>)[key] =
    value as NonNullable<FieldConfigOverrides[K]>;
}

function mergeOverrides(
  current: FieldConfigOverrides,
  patch: FieldConfigOverrides,
): FieldConfigOverrides {
  const next: FieldConfigOverrides = { ...current };
  const keys = Object.keys(patch) as (keyof FieldConfigOverrides)[];
  for (const key of keys) {
    const patchValue = patch[key];
    if (patchValue === undefined) continue;
    const currentValue = current[key];
    if (
      currentValue != null &&
      typeof currentValue === 'object' &&
      typeof patchValue === 'object' &&
      !Array.isArray(patchValue)
    ) {
      assignSection(next, key, {
        ...(currentValue as object),
        ...(patchValue as object),
      } as FieldConfigOverrides[typeof key]);
      continue;
    }
    assignSection(next, key, patchValue);
  }
  return next;
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
