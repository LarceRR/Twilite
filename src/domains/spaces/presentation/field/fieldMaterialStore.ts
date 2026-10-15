import { create } from 'zustand';

export type FieldMaterialProvider = 'ambientCG' | 'Poly Haven';
export type FieldMaterialResolution = '1K' | '2K' | '4K' | '8K';
export type FieldMaterialMapKey =
  | 'color'
  | 'normal'
  | 'roughness'
  | 'metalness'
  | 'ao'
  | 'bump'
  | 'displacement'
  | 'emissive';

export type FieldMaterialMaps = Partial<Record<FieldMaterialMapKey, string>>;

export type FieldMaterialPreferences = {
  readonly provider: FieldMaterialProvider;
  readonly assetId: string | null;
  readonly assetName: string;
  readonly resolution: FieldMaterialResolution;
  readonly maps: FieldMaterialMaps;
  readonly tilingScaleX: number;
  readonly tilingScaleY: number;
  readonly textureOffsetX: number;
  readonly textureOffsetY: number;
  readonly textureRotationDeg: number;
  readonly tintHex: string;
  readonly roughness: number;
  readonly metalness: number;
  readonly normalScaleX: number;
  readonly normalScaleY: number;
  readonly bumpScale: number;
  readonly displacementScale: number;
  readonly displacementBias: number;
  readonly aoMapIntensity: number;
  readonly emissiveHex: string;
  readonly emissiveIntensity: number;
  readonly opacity: number;
  readonly alphaTest: number;
  readonly anisotropy: number;
  readonly transparent: boolean;
  readonly doubleSide: boolean;
  readonly flatShading: boolean;
  readonly wireframe: boolean;
  readonly useColorMap: boolean;
  readonly useNormalMap: boolean;
  readonly useRoughnessMap: boolean;
  readonly useMetalnessMap: boolean;
  readonly useAoMap: boolean;
  readonly useBumpMap: boolean;
  readonly useDisplacementMap: boolean;
  readonly useEmissiveMap: boolean;
  readonly generatedTilesEnabled: boolean;
  readonly worldSeed: string;
  readonly inactiveMinHeight: number;
  readonly inactiveMaxHeight: number;
  readonly activeMinHeight: number;
  readonly activeMaxHeight: number;
};

export type FieldMaterialState = FieldMaterialPreferences & {
  readonly setOption: <K extends keyof FieldMaterialPreferences>(
    key: K,
    value: FieldMaterialPreferences[K],
  ) => void;
  readonly patchOptions: (patch: Partial<FieldMaterialPreferences>) => void;
  readonly setDownloadedMaterial: (
    asset: { readonly provider: FieldMaterialProvider; readonly id: string; readonly name: string },
    resolution: FieldMaterialResolution,
    maps: FieldMaterialMaps,
  ) => void;
  readonly hydrate: (preferences: Partial<FieldMaterialPreferences>) => void;
  readonly reset: () => void;
};

export const DEFAULT_FIELD_MATERIAL_PREFERENCES: FieldMaterialPreferences = {
  provider: 'ambientCG',
  assetId: null,
  assetName: '',
  resolution: '1K',
  maps: {},
  // One seamless material image spans approximately four world cells by default.
  tilingScaleX: 0.25,
  tilingScaleY: 0.25,
  textureOffsetX: 0,
  textureOffsetY: 0,
  textureRotationDeg: 0,
  tintHex: '#FFFFFF',
  roughness: 0.82,
  metalness: 0.04,
  normalScaleX: 1,
  normalScaleY: 1,
  bumpScale: 0.08,
  displacementScale: 0,
  displacementBias: 0,
  aoMapIntensity: 1,
  emissiveHex: '#000000',
  emissiveIntensity: 0,
  opacity: 1,
  alphaTest: 0.02,
  anisotropy: 4,
  transparent: false,
  doubleSide: false,
  flatShading: false,
  wireframe: false,
  useColorMap: true,
  useNormalMap: true,
  useRoughnessMap: true,
  useMetalnessMap: true,
  useAoMap: true,
  useBumpMap: false,
  useDisplacementMap: false,
  useEmissiveMap: false,
  generatedTilesEnabled: true,
  worldSeed: 'twilite-world-001',
  inactiveMinHeight: 0,
  inactiveMaxHeight: 3,
  activeMinHeight: 6,
  activeMaxHeight: 9,
};

function normalizePreferences(
  current: FieldMaterialPreferences,
  patch: Partial<FieldMaterialPreferences>,
): FieldMaterialPreferences {
  const next = { ...current, ...patch };
  const minInactive = clampInteger(next.inactiveMinHeight, 0, 3);
  const maxInactive = clampInteger(next.inactiveMaxHeight, 0, 3);
  const minActive = clampInteger(next.activeMinHeight, 1, 24);
  const maxActive = clampInteger(next.activeMaxHeight, 1, 24);
  return {
    ...next,
    maps: patch.maps === undefined ? current.maps : { ...patch.maps },
    tilingScaleX: clamp(next.tilingScaleX, 0.01, 4),
    tilingScaleY: clamp(next.tilingScaleY, 0.01, 4),
    textureOffsetX: clamp(next.textureOffsetX, -4, 4),
    textureOffsetY: clamp(next.textureOffsetY, -4, 4),
    textureRotationDeg: clamp(next.textureRotationDeg, -180, 180),
    roughness: clamp(next.roughness, 0, 1),
    metalness: clamp(next.metalness, 0, 1),
    normalScaleX: clamp(next.normalScaleX, 0, 5),
    normalScaleY: clamp(next.normalScaleY, 0, 5),
    bumpScale: clamp(next.bumpScale, 0, 4),
    displacementScale: clamp(next.displacementScale, -10, 10),
    displacementBias: clamp(next.displacementBias, -5, 5),
    aoMapIntensity: clamp(next.aoMapIntensity, 0, 2),
    emissiveIntensity: clamp(next.emissiveIntensity, 0, 5),
    opacity: clamp(next.opacity, 0, 1),
    alphaTest: clamp(next.alphaTest, 0, 1),
    anisotropy: clampInteger(next.anisotropy, 1, 16),
    inactiveMinHeight: Math.min(minInactive, maxInactive),
    inactiveMaxHeight: Math.max(minInactive, maxInactive),
    activeMinHeight: Math.min(minActive, maxActive),
    activeMaxHeight: Math.max(minActive, maxActive),
    worldSeed: next.worldSeed.slice(0, 128),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

export const useFieldMaterialStore = create<FieldMaterialState>()((set) => ({
  ...DEFAULT_FIELD_MATERIAL_PREFERENCES,
  setOption: (key, value) =>
    set((state) => normalizePreferences(state, { [key]: value } as Partial<FieldMaterialPreferences>)),
  patchOptions: (patch) => set((state) => normalizePreferences(state, patch)),
  setDownloadedMaterial: (asset, resolution, maps) =>
    set((state) =>
      normalizePreferences(state, {
        provider: asset.provider,
        assetId: asset.id,
        assetName: asset.name,
        resolution,
        maps: { ...maps },
      }),
    ),
  hydrate: (preferences) =>
    set((state) => normalizePreferences(state, preferences ?? {})),
  reset: () => set({ ...DEFAULT_FIELD_MATERIAL_PREFERENCES }),
}));

export function persistedFieldMaterialPreferences(
  state: FieldMaterialState,
): FieldMaterialPreferences {
  return {
    provider: state.provider,
    assetId: state.assetId,
    assetName: state.assetName,
    resolution: state.resolution,
    maps: { ...state.maps },
    tilingScaleX: state.tilingScaleX,
    tilingScaleY: state.tilingScaleY,
    textureOffsetX: state.textureOffsetX,
    textureOffsetY: state.textureOffsetY,
    textureRotationDeg: state.textureRotationDeg,
    tintHex: state.tintHex,
    roughness: state.roughness,
    metalness: state.metalness,
    normalScaleX: state.normalScaleX,
    normalScaleY: state.normalScaleY,
    bumpScale: state.bumpScale,
    displacementScale: state.displacementScale,
    displacementBias: state.displacementBias,
    aoMapIntensity: state.aoMapIntensity,
    emissiveHex: state.emissiveHex,
    emissiveIntensity: state.emissiveIntensity,
    opacity: state.opacity,
    alphaTest: state.alphaTest,
    anisotropy: state.anisotropy,
    transparent: state.transparent,
    doubleSide: state.doubleSide,
    flatShading: state.flatShading,
    wireframe: state.wireframe,
    useColorMap: state.useColorMap,
    useNormalMap: state.useNormalMap,
    useRoughnessMap: state.useRoughnessMap,
    useMetalnessMap: state.useMetalnessMap,
    useAoMap: state.useAoMap,
    useBumpMap: state.useBumpMap,
    useDisplacementMap: state.useDisplacementMap,
    useEmissiveMap: state.useEmissiveMap,
    generatedTilesEnabled: state.generatedTilesEnabled,
    worldSeed: state.worldSeed,
    inactiveMinHeight: state.inactiveMinHeight,
    inactiveMaxHeight: state.inactiveMaxHeight,
    activeMinHeight: state.activeMinHeight,
    activeMaxHeight: state.activeMaxHeight,
  };
}
