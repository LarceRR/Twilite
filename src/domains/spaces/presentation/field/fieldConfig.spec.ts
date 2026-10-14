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
      camera: { position: { x: -100 }, swipeInertiaSpeedScale: 0.5 },
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
    expect(merged.camera.swipeInertiaSpeedScale).toBe(0.5);
  });

  it('preserves sibling values while applying deeply nested field config patches', () => {
    const store = useFieldConfigStore.getState();
    store.patchOverrides({
      lighting: { objectGlow: { fallbackColor: '#FF5911' } },
    });
    useFieldConfigStore.getState().patchOverrides({
      lighting: { objectGlow: { fallbackIntensity: 2.1 } },
    });
    useFieldConfigStore.getState().patchOverrides({
      lighting: { shadows: { bias: -0.001 } },
    });

    expect(getFieldConfig().lighting.objectGlow.fallbackColor).toBe('#FF5911');
    expect(getFieldConfig().lighting.objectGlow.fallbackIntensity).toBe(2.1);
    expect(getFieldConfig().lighting.objectGlow.fallbackDistance).toBe(
      DEFAULT_FIELD_CONFIG.lighting.objectGlow.fallbackDistance,
    );
    expect(getFieldConfig().lighting.shadows.bias).toBe(-0.001);
    expect(getFieldConfig().lighting.shadows.mapSizePx).toBe(
      DEFAULT_FIELD_CONFIG.lighting.shadows.mapSizePx,
    );
  });

  it('uses low warm reflectance and softened but enabled platform shadows by default', () => {
    expect(DEFAULT_FIELD_CONFIG.lighting.surfaceAmbientColor).toBe('#FFAE00');
    expect(DEFAULT_FIELD_CONFIG.lighting.surfaceAmbientIntensity).toBe(0.025);
    expect(DEFAULT_FIELD_CONFIG.lighting.shadows.filterRadius).toBe(6);
    expect(DEFAULT_FIELD_CONFIG.lighting.shadows.localShadowIntensity).toBe(0.5);
    expect(DEFAULT_FIELD_CONFIG.lighting.objectGlow.heightAbovePlatform).toBe(44);
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
