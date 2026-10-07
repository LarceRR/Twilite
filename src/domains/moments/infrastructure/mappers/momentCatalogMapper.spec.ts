import { describe, expect, it } from 'vitest';

import { mergeMomentCatalogPages } from '../../application/mergeMomentCatalogPages';
import { catalogAssetUrl } from './catalogAssetUrl';
import { catalogSearchParams, parseMomentCatalogPage } from './momentCatalogMapper';

const BASE = 'http://10.0.2.2:3000/v1';
const PROJECT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OBJECT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MEDIA_ID = '11111111-1111-4111-8111-111111111111';

function sprite(frameCount: number, sheetUrl: string) {
  return {
    sheetUrl,
    frameWidth: 16,
    frameHeight: 16,
    columns: frameCount,
    rows: 1,
    frameCount,
    staticPreviewFrame: 0,
    frames: Array.from({ length: frameCount }, (_, frame) => ({ frame, durationMs: 80 })),
    mediaId: MEDIA_ID,
  };
}

describe('catalogSearchParams', () => {
  it('asks the API for Good projects', () => {
    expect(catalogSearchParams({ kind: 'good', limit: 8 })).toEqual({
      objectType: 'Good',
      limit: 8,
    });
  });

  it('asks the API for Bad projects and forwards a cursor and search', () => {
    expect(
      catalogSearchParams({ kind: 'bad', cursor: 'abc', query: '  костёр  ', limit: 8 }),
    ).toEqual({
      objectType: 'Bad',
      limit: 8,
      cursor: 'abc',
      q: 'костёр',
    });
  });
});

describe('catalogAssetUrl', () => {
  it('joins an API path onto the origin', () => {
    const path = `/v1/tpg/pixel-objects/${OBJECT_ID}/revisions/2/sheet`;
    expect(catalogAssetUrl(BASE, path)).toBe(`http://10.0.2.2:3000${path}`);
  });

  it('joins a user avatar path onto the origin', () => {
    const path = `/v1/users/${PROJECT_ID}/avatar`;
    expect(catalogAssetUrl(BASE, path)).toBe(`http://10.0.2.2:3000${path}`);
    expect(catalogAssetUrl(BASE, '/v1/users/not-a-uuid/avatar')).toBeNull();
  });

  it('drops bucket URLs and unexpected paths', () => {
    expect(catalogAssetUrl(BASE, 'https://bucket.r2.dev/sheet.png')).toBeNull();
    expect(catalogAssetUrl(BASE, '/v1/media/secret')).toBeNull();
    expect(catalogAssetUrl('not a url', `/v1/tpg/projects/${PROJECT_ID}/avatar`)).toBeNull();
  });
});

describe('parseMomentCatalogPage', () => {
  const sheet = `/v1/tpg/pixel-objects/${OBJECT_ID}/revisions/3/sheet`;

  it('keeps a project and only the closed sprite fields', () => {
    const page = parseMomentCatalogPage(
      {
        items: [
          {
            id: PROJECT_ID,
            title: 'Lights',
            authorDisplayName: 'Twilite',
            avatarUrl: `/v1/tpg/projects/${PROJECT_ID}/avatar`,
            official: true,
            objectCount: 2,
            byteSize: 4096,
            moments: [
              {
                id: OBJECT_ID,
                title: 'Camping',
                previewUrl: `/v1/tpg/pixel-objects/${OBJECT_ID}/revisions/3/preview`,
                sprite: sprite(3, sheet),
              },
            ],
          },
        ],
        nextCursor: 'next',
      },
      BASE,
    );

    const moment = page.packs[0]?.moments[0];
    expect(page.packs[0]).toMatchObject({
      title: 'Lights',
      author: 'Twilite',
      official: true,
      objectCount: 2,
      byteSize: 4096,
    });
    expect(moment?.sprite?.frames).toHaveLength(3);
    expect(moment?.sprite?.sheetUrl).toBe(`http://10.0.2.2:3000${sheet}`);
    expect(JSON.stringify(page)).not.toContain(MEDIA_ID);
    expect(page.nextCursor).toBe('next');
  });

  it('drops a broken moment and keeps the project', () => {
    const page = parseMomentCatalogPage(
      {
        items: [
          {
            id: PROJECT_ID,
            title: 'Lights',
            authorDisplayName: 'Twilite',
            official: false,
            objectCount: 1,
            byteSize: 0,
            moments: [
              { id: 'nope', title: 'x' },
              { id: OBJECT_ID, title: 'Still', sprite: null },
            ],
          },
        ],
      },
      BASE,
    );

    expect(page.packs[0]?.moments.map((moment) => moment.name)).toEqual(['Still']);
    expect(page.nextCursor).toBeNull();
  });

  it('rejects an envelope that is not a catalog page', () => {
    expect(() => parseMomentCatalogPage({ ok: true }, BASE)).toThrow(/неожиданном/);
  });
});

describe('mergeMomentCatalogPages', () => {
  it('keeps the first copy when a cursor repeats a project', () => {
    const pack = {
      id: PROJECT_ID,
      title: 'Lights',
      author: 'Twilite',
      official: false,
      avatarUrl: null,
      objectCount: 1,
      byteSize: 1,
      moments: [],
    };
    expect(
      mergeMomentCatalogPages([
        { packs: [pack], nextCursor: 'next' },
        { packs: [{ ...pack, title: 'Again' }], nextCursor: null },
      ]).map((item) => item.title),
    ).toEqual(['Lights']);
  });
});
