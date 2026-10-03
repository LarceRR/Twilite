/** Nested Field Space tuning knobs (runtime-overridable). */

export type FieldVec3 = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type FieldConfig = {
  readonly grid: {
    readonly cellSizePx: number;
    readonly centerCols: number;
    readonly sideExtraCols: number;
    readonly rows: number;
  };
  readonly chunks: {
    readonly cols: number;
    readonly behind: number;
    readonly ahead: number;
    readonly lookAheadPx: number;
    readonly prefetchExtraAhead: number;
    readonly gpuUploadSteady: number;
    readonly lineZLift: number;
  };
  readonly wave: {
    readonly sizePx: number;
    readonly pixelSizePx: number;
    readonly maxAlpha: number;
    readonly durationSec: number;
    readonly fadeInEnd: number;
    readonly fadeOutStart: number;
  };
  readonly camera: {
    readonly position: FieldVec3;
    readonly rotationDeg: FieldVec3;
    readonly fov: number;
    readonly near: number;
    readonly far: number;
    readonly framingMargin: number;
    readonly framingElevationDeg: number;
    readonly moveStepPx: number;
    readonly rotateStepDeg: number;
    readonly holdRampMs: number;
    readonly holdMaxStep: number;
    readonly hudPublishMs: number;
    readonly activeAxisHighlightMs: number;
  };
  readonly labels: {
    readonly scale: number;
    readonly padding: number;
    readonly raise: number;
    readonly activeCenterSize: number;
    readonly activeBorder: number;
  };
  readonly activeCells: {
    readonly sideSpan: number;
    readonly fillHex: string;
    readonly centerHex: string;
    readonly labelTextHex: string;
  };
  readonly axes: {
    readonly length: number;
    readonly headLength: number;
    readonly headWidth: number;
    readonly originRadius: number;
    readonly liftZ: number;
    readonly renderOrder: number;
  };
  readonly press: {
    readonly longPressMs: number;
    readonly secondBurstGapSec: number;
  };
  readonly holdRepeat: {
    readonly tickMs: number;
    readonly startDelayMs: number;
  };
  readonly lighting: {
    readonly ambientIntensity: number;
    readonly directionalIntensity: number;
    readonly directionalPosition: readonly [number, number, number];
  };
};

export type FieldConfigOverrides = DeepPartial<FieldConfig>;

export type DeepPartial<T> = {
  readonly [K in keyof T]?: T[K] extends readonly (infer U)[]
    ? readonly U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export const DEFAULT_FIELD_CONFIG: FieldConfig = {
  grid: {
    cellSizePx: 60,
    centerCols: 10,
    sideExtraCols: 20,
    rows: 15,
  },
  chunks: {
    cols: 10,
    behind: 1,
    ahead: 3,
    lookAheadPx: 780,
    prefetchExtraAhead: 2,
    gpuUploadSteady: 1,
    lineZLift: 0.5,
  },
  wave: {
    sizePx: 96,
    pixelSizePx: 4,
    maxAlpha: 0.8,
    durationSec: 0.48,
    fadeInEnd: 0.08,
    fadeOutStart: 0.55,
  },
  camera: {
    position: { x: -469, y: 0, z: 408 },
    rotationDeg: { x: 70, y: 0, z: -90 },
    fov: 42,
    near: 1,
    far: 30_000,
    framingMargin: 1.18,
    framingElevationDeg: 58,
    moveStepPx: 1,
    rotateStepDeg: 1,
    holdRampMs: 1500,
    holdMaxStep: 20,
    hudPublishMs: 100,
    activeAxisHighlightMs: 280,
  },
  labels: {
    scale: 1,
    padding: 3,
    raise: 10,
    activeCenterSize: 6,
    activeBorder: 1,
  },
  activeCells: {
    sideSpan: 2,
    fillHex: '#fdba2f',
    centerHex: '#ff1493',
    labelTextHex: '#18151E',
  },
  axes: {
    length: 180,
    headLength: 36,
    headWidth: 18,
    originRadius: 8,
    liftZ: 6,
    renderOrder: 1000,
  },
  press: {
    longPressMs: 330,
    secondBurstGapSec: 0.12,
  },
  holdRepeat: {
    tickMs: 50,
    startDelayMs: 180,
  },
  lighting: {
    ambientIntensity: 0.85,
    directionalIntensity: 0.55,
    directionalPosition: [240, 420, 180],
  },
};

export function fieldGridColsFromConfig(grid: FieldConfig['grid']): number {
  return grid.centerCols + grid.sideExtraCols * 2;
}

export function fieldGridWidthFromConfig(grid: FieldConfig['grid']): number {
  return fieldGridColsFromConfig(grid) * grid.cellSizePx;
}

export function fieldGridHeightFromConfig(grid: FieldConfig['grid']): number {
  return grid.rows * grid.cellSizePx;
}

export function fieldWaveMaxRadiusPx(wave: FieldConfig['wave']): number {
  return wave.sizePx / 2;
}

export function fieldWaveMaxRadiusSteps(wave: FieldConfig['wave']): number {
  return Math.floor(fieldWaveMaxRadiusPx(wave) / wave.pixelSizePx);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeSection<T extends Record<string, unknown>>(
  base: T,
  patch: DeepPartial<T> | undefined,
): T {
  if (patch == null) return base;
  const next: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch) as (keyof T & string)[]) {
    const patchValue = patch[key];
    if (patchValue === undefined) continue;
    const baseValue = base[key];
    next[key] =
      isPlainObject(baseValue) && isPlainObject(patchValue)
        ? mergeSection(
            baseValue as Record<string, unknown>,
            patchValue as DeepPartial<Record<string, unknown>>,
          )
        : patchValue;
  }
  return next as T;
}

export function mergeFieldConfig(overrides: FieldConfigOverrides = {}): FieldConfig {
  return {
    grid: mergeSection(DEFAULT_FIELD_CONFIG.grid, overrides.grid),
    chunks: mergeSection(DEFAULT_FIELD_CONFIG.chunks, overrides.chunks),
    wave: mergeSection(DEFAULT_FIELD_CONFIG.wave, overrides.wave),
    camera: mergeSection(
      DEFAULT_FIELD_CONFIG.camera as unknown as Record<string, unknown>,
      overrides.camera as DeepPartial<Record<string, unknown>> | undefined,
    ) as FieldConfig['camera'],
    labels: mergeSection(DEFAULT_FIELD_CONFIG.labels, overrides.labels),
    activeCells: mergeSection(DEFAULT_FIELD_CONFIG.activeCells, overrides.activeCells),
    axes: mergeSection(DEFAULT_FIELD_CONFIG.axes, overrides.axes),
    press: mergeSection(DEFAULT_FIELD_CONFIG.press, overrides.press),
    holdRepeat: mergeSection(DEFAULT_FIELD_CONFIG.holdRepeat, overrides.holdRepeat),
    lighting: mergeSection(
      DEFAULT_FIELD_CONFIG.lighting as unknown as Record<string, unknown>,
      overrides.lighting as DeepPartial<Record<string, unknown>> | undefined,
    ) as FieldConfig['lighting'],
  };
}

export function hexToRgbaTuple(
  hex: string,
  alpha: number = 255,
): readonly [number, number, number, number] {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}
