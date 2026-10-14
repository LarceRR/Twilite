import { describe, expect, it } from 'vitest';

import { catalogAssetUrl } from './catalogAssetUrl';

describe('catalogAssetUrl', () => {
  const baseUrl = 'https://api.example.test/v1';
  const path = '/v1/tpg/pixel-objects/123e4567-e89b-12d3-a456-426614174000/revisions/2/sheet';

  it('resolves allowlisted assets on the configured API origin', () => {
    expect(catalogAssetUrl(baseUrl, path)).toBe(`https://api.example.test${path}`);
  });

  it('rejects absolute URLs and unrecognized media paths', () => {
    expect(catalogAssetUrl(baseUrl, 'https://attacker.test/sheet.png')).toBeNull();
    expect(catalogAssetUrl(baseUrl, '/v1/private/sheet.png')).toBeNull();
  });
});
