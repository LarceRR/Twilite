import { describe, expect, it } from 'vitest';

import { DEFAULT_FIELD_CONFIG } from '@/domains/spaces/presentation/field/fieldConfig';

import {
  buildFieldConfigSettingPatch,
  FIELD_CONFIG_SETTING_GROUPS,
} from './FieldConfigSettingCatalog';

function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      leafPaths(item, prefix.length === 0 ? String(index) : `${prefix}.${index}`),
    );
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      leafPaths(child, prefix.length === 0 ? key : `${prefix}.${key}`),
    );
  }
  return [prefix];
}

describe('FieldConfigSettingCatalog', () => {
  it('builds nested patches for scalar settings and keeps the other vector components', () => {
    expect(
      buildFieldConfigSettingPatch(DEFAULT_FIELD_CONFIG, 'camera.position.x', -500),
    ).toEqual({ camera: { position: { x: -500 } } });

    expect(
      buildFieldConfigSettingPatch(
        DEFAULT_FIELD_CONFIG,
        'lighting.directionalPosition.0',
        500,
      ),
    ).toEqual({
      lighting: {
        directionalPosition: [500, ...DEFAULT_FIELD_CONFIG.lighting.directionalPosition.slice(1)],
      },
    });
  });

  it('exposes every config leaf exactly once in the developer settings', () => {
    const catalogPaths = FIELD_CONFIG_SETTING_GROUPS.flatMap((group) =>
      group.settings.map((setting) => setting.path),
    );
    const configPaths = leafPaths(DEFAULT_FIELD_CONFIG);

    expect(new Set(catalogPaths).size).toBe(catalogPaths.length);
    expect([...catalogPaths].sort()).toEqual([...configPaths].sort());
  });
});
