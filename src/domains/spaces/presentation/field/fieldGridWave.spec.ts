import { describe, expect, it } from 'vitest';

import {
  FIELD_WAVE_DURATION_SEC,
  FIELD_WAVE_MAX_ALPHA,
  FIELD_WAVE_MAX_RADIUS_PX,
  FIELD_WAVE_MAX_RADIUS_STEPS,
  FIELD_WAVE_PIXEL_SIZE_PX,
  FIELD_WAVE_SIZE_PX,
  FIELD_WAVE_SLOT_INACTIVE,
  combineWaveOpacities,
  fieldWaveIsAlive,
  fieldWaveLifeFade,
  fieldWavePixelDist,
  fieldWaveQuantize,
  fieldWaveRadius,
  fieldWaveSampleOpacity,
  pickFieldWaveSlot,
} from './fieldGridWave';

describe('fieldGridWave', () => {
  it('keeps a ~96×96 world footprint with coarse 4px wave texels', () => {
    expect(FIELD_WAVE_SIZE_PX).toBe(96);
    expect(FIELD_WAVE_MAX_RADIUS_PX).toBe(48);
    expect(FIELD_WAVE_PIXEL_SIZE_PX).toBe(4);
    expect(FIELD_WAVE_MAX_RADIUS_STEPS).toBe(12);
    expect(fieldWaveRadius(FIELD_WAVE_DURATION_SEC)).toBe(12);
  });

  it('grows for the full lifetime and only hits max at the end', () => {
    expect(fieldWaveRadius(0)).toBe(0);
    const mid = fieldWaveRadius(FIELD_WAVE_DURATION_SEC * 0.5);
    const late = fieldWaveRadius(FIELD_WAVE_DURATION_SEC * 0.9);
    expect(mid).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(mid);
    expect(late).toBeLessThanOrEqual(12);
    expect(fieldWaveRadius(FIELD_WAVE_DURATION_SEC)).toBe(12);
  });

  it('fades slower so the wave is still soft when a bit larger', () => {
    const peak = fieldWaveLifeFade(FIELD_WAVE_DURATION_SEC * 0.4);
    const late = fieldWaveLifeFade(FIELD_WAVE_DURATION_SEC * 0.85);
    expect(peak).toBeGreaterThan(0.7);
    expect(late).toBeGreaterThan(0.05);
    expect(late).toBeLessThan(0.55);
    expect(fieldWaveLifeFade(FIELD_WAVE_DURATION_SEC)).toBe(0);
    expect(fieldWaveIsAlive(0.1)).toBe(true);
  });

  it('uses a center→rim gradient capped at 80%', () => {
    const life = 1;
    const radius = 10;
    expect(fieldWaveSampleOpacity(0, radius, life)).toBe(0);
    expect(fieldWaveSampleOpacity(5, radius, life)).toBeCloseTo(0.5 * FIELD_WAVE_MAX_ALPHA, 5);
    expect(fieldWaveSampleOpacity(10, radius, life)).toBeCloseTo(FIELD_WAVE_MAX_ALPHA, 5);
    expect(fieldWaveSampleOpacity(11, radius, life)).toBe(0);
  });

  it('quantizes world space into coarse wave pixels', () => {
    expect(fieldWaveQuantize(0)).toBe(0);
    expect(fieldWaveQuantize(3)).toBe(0);
    expect(fieldWaveQuantize(4)).toBe(1);
    expect(fieldWavePixelDist(3, 4)).toBe(5);
  });

  it('picks a free slot, then the oldest when all busy', () => {
    expect(pickFieldWaveSlot([FIELD_WAVE_SLOT_INACTIVE, 1, 2, 3], 10, 1)).toBe(0);
    expect(pickFieldWaveSlot([0.1, 0.2, 9.5, 9.6], 10, 1)).toBe(0);
    expect(pickFieldWaveSlot([9.1, 9.2, 9.3, 9.0], 10, 1)).toBe(3);
  });

  it('combines overlapping waves with max opacity', () => {
    expect(combineWaveOpacities(0.6, 0.8)).toBe(0.8);
  });
});
