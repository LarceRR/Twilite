export type FeatureFlag = 'ai';

export type FeatureFlags = Readonly<Record<FeatureFlag, boolean>>;

const defaults: FeatureFlags = {
  ai: false,
};

let overrides: Partial<FeatureFlags> = {};

export function isEnabled(flag: FeatureFlag): boolean {
  return overrides[flag] ?? defaults[flag];
}

export function setFeatureFlagOverrides(next: Partial<FeatureFlags>): void {
  overrides = { ...overrides, ...next };
}

export const featureFlags = { isEnabled, setFeatureFlagOverrides } as const;
