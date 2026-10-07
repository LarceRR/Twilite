import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_FIELD_CONFIG,
  fieldGridColsFromConfig,
  fieldWaveMaxRadiusSteps,
  hexToRgbaTuple,
  mergeFieldConfig,
} from './fieldConfig';
import {
  getFieldConfig,
  persistedFieldConfigOverrides,
  useFieldConfigStore,
} from './fieldConfigStore';

describe('fieldConfig', () => {
  afterEach(() => {
    useFieldConfigStore.getState().reset();
  });

  it('keeps defaults when overrides are empty', () => {
    expect(mergeFieldConfig({})).toEqual(DEFAULT_FIELD_CONFIG);
    expect(getFieldConfig()).toEqual(DEFAULT_FIELD_CONFIG);
  });

  it('merges nested section patches', () => {
    const merged = mergeFieldConfig({
      grid: { cellSizePx: 80, rows: 21 },
      wave: { maxAlpha: 0.5 },
      camera: { position: { x: -100 } },
    });
    expect(merged.grid.cellSizePx).toBe(80);
    expect(merged.grid.rows).toBe(21);
    expect(merged.grid.centerCols).toBe(DEFAULT_FIELD_CONFIG.grid.centerCols);
    expect(merged.wave.maxAlpha).toBe(0.5);
    expect(merged.wave.durationSec).toBe(DEFAULT_FIELD_CONFIG.wave.durationSec);
    expect(merged.camera.position).toEqual({
      x: -100,
      y: DEFAULT_FIELD_CONFIG.camera.position.y,
      z: DEFAULT_FIELD_CONFIG.camera.position.z,
    });
  });

  it('derives grid cols and wave radius steps', () => {
    expect(fieldGridColsFromConfig(DEFAULT_FIELD_CONFIG.grid)).toBe(50);
    expect(fieldWaveMaxRadiusSteps(DEFAULT_FIELD_CONFIG.wave)).toBe(12);
  });

  it('parses hex colors', () => {
    expect(hexToRgbaTuple('#fdba2f')).toEqual([253, 186, 47, 255]);
    expect(hexToRgbaTuple('#ff1493')).toEqual([255, 20, 147, 255]);
  });
});

describe('fieldConfigStore', () => {
  afterEach(() => {
    useFieldConfigStore.getState().reset();
  });

  it('hydrates, patches sections, and resets', () => {
    useFieldConfigStore.getState().hydrate({ grid: { rows: 21 } });
    expect(getFieldConfig().grid.rows).toBe(21);

    useFieldConfigStore.getState().setSection('wave', { durationSec: 1 });
    expect(getFieldConfig().wave.durationSec).toBe(1);
    expect(getFieldConfig().grid.rows).toBe(21);

    useFieldConfigStore.getState().patchOverrides({
      chunks: { lookAheadPx: 900 },
    });
    expect(getFieldConfig().chunks.lookAheadPx).toBe(900);

    expect(persistedFieldConfigOverrides(useFieldConfigStore.getState())).toEqual({
      grid: { rows: 21 },
      wave: { durationSec: 1 },
      chunks: { lookAheadPx: 900 },
    });

    useFieldConfigStore.getState().reset();
    expect(getFieldConfig()).toEqual(DEFAULT_FIELD_CONFIG);
  });
});
