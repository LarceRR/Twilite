import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FIELD_CONFIG,
  mergeFieldConfig,
} from '@/domains/spaces/presentation/field/fieldConfig';

import {
  parseFieldConfigJson,
  serializeFieldConfigJson,
} from './fieldConfigJson';

describe('fieldConfigJson', () => {
  it('round-trips a complete field config through a versioned JSON document', () => {
    const config = mergeFieldConfig({
      grid: { showDividers: false, rows: 19 },
      camera: { position: { x: -250 } },
      lighting: {
        objectGlow: { fallbackColor: '#FF5911', fallbackDistance: 250 },
      },
    });

    expect(parseFieldConfigJson(serializeFieldConfigJson(config))).toEqual(config);
  });

  it('fills newly added settings from the current defaults', () => {
    const imported = parseFieldConfigJson(
      JSON.stringify({
        format: 'twilite-field-config',
        version: 1,
        config: { grid: { rows: 20 } },
      }),
    );

    expect(imported.grid.rows).toBe(20);
    expect(imported.grid.showDividers).toBe(DEFAULT_FIELD_CONFIG.grid.showDividers);
    expect(imported.lighting.objectGlow.minimumVisibleIntensity).toBe(
      DEFAULT_FIELD_CONFIG.lighting.objectGlow.minimumVisibleIntensity,
    );
  });

  it('rejects unknown properties, unsupported versions, and invalid colors', () => {
    expect(() =>
      parseFieldConfigJson(JSON.stringify({ grid: { rows: 10, imaginary: true } })),
    ).toThrow(/Unknown setting/);

    expect(() =>
      parseFieldConfigJson(
        JSON.stringify({
          format: 'twilite-field-config',
          version: 999,
          config: {},
        }),
      ),
    ).toThrow(/версия/i);

    expect(() =>
      parseFieldConfigJson(
        JSON.stringify({
          lighting: { objectGlow: { fallbackColor: 'orange' } },
        }),
      ),
    ).toThrow(/HEX color/);
  });

  it('rejects structurally valid JSON with unsafe runtime values', () => {
    expect(() =>
      parseFieldConfigJson(JSON.stringify({ grid: { cellSizePx: 0 } })),
    ).toThrow(/grid.cellSizePx/);

    expect(() =>
      parseFieldConfigJson(
        JSON.stringify({ camera: { near: 500, far: 100 } }),
      ),
    ).toThrow(/камера/i);
  });

  it('reports malformed JSON clearly', () => {
    expect(() => parseFieldConfigJson('{')).toThrow(/JSON/);
  });
});
