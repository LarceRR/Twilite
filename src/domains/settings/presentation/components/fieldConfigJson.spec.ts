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
        objectGlow: { fallbackColor: '#FF5911', heightAbovePlatform: 2.5 },
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
    expect(imported.lighting.objectGlow.heightAbovePlatform).toBe(
      DEFAULT_FIELD_CONFIG.lighting.objectGlow.heightAbovePlatform,
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
    ).toThrow(/version/);

    expect(() =>
      parseFieldConfigJson(
        JSON.stringify({
          lighting: { objectGlow: { fallbackColor: 'orange' } },
        }),
      ),
    ).toThrow(/HEX color/);
  });

  it('reports malformed JSON clearly', () => {
    expect(() => parseFieldConfigJson('{')).toThrow(/JSON/);
  });
});
