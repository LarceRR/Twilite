import { describe, expect, it } from 'vitest';

import { normalizeAmbientAssets, normalizePolyHavenAssets } from './fieldMaterialCatalog';

describe('field material catalog normalization', () => {
  it('normalizes ambientCG v3-style keyed metadata and preview URLs', () => {
    const assets = normalizeAmbientAssets({
      Tiles085: {
        title: 'Tiles 085',
        shortDescription: 'Weathered stone tiles',
        tags: ['stone', 'tiles'],
        previews: {
          small: 'https://ambientcg.com/get?file=Tiles085_1K-JPG_Color.jpg',
        },
        downloads: { '1K': {} },
        maps: {},
      },
    });

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      provider: 'ambientCG',
      id: 'Tiles085',
      name: 'Tiles 085',
      description: 'Weathered stone tiles',
      tags: ['stone', 'tiles'],
      previewUrl: 'https://ambientcg.com/view?id=Tiles085&preview=1',
    });
  });

  it('normalizes the Poly Haven texture catalogue and ignores non-textures', () => {
    const assets = normalizePolyHavenAssets({
      concrete_floor_01: {
        type: 1,
        name: 'Concrete Floor 01',
        description: 'Dark concrete',
        category: 'Concrete',
        tags: ['concrete', 'floor'],
        thumbnail_url: 'https://cdn.polyhaven.com/asset_img/thumbs/concrete_floor_01.png',
      },
      sunset: {
        type: 0,
        name: 'Sunset',
        category: 'HDRIs',
        tags: ['sky'],
      },
    });

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      provider: 'Poly Haven',
      id: 'concrete_floor_01',
      name: 'Concrete Floor 01',
      category: 'Concrete',
      previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/concrete_floor_01.png',
    });
  });
});
