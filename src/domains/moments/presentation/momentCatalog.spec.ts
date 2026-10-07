import { describe, expect, it } from 'vitest';

import type { MomentPack } from '../domain/entities/MomentCatalog';
import {
  catalogFromPacks,
  filterMomentCatalog,
  formatObjectCount,
  MOMENT_CATALOG_COPY,
  parseMomentCatalogKind,
} from './momentCatalog';

const camping = {
  id: 'camping',
  name: 'Camping',
  previewUrl: null,
  sprite: null,
};

const sunrise = {
  id: 'sunrise',
  name: 'Sunrise',
  previewUrl: null,
  sprite: null,
};

function pack(overrides: Partial<MomentPack> = {}): MomentPack {
  return {
    id: 'lights',
    title: 'Lights',
    author: 'Руслан',
    official: false,
    avatarUrl: null,
    objectCount: 2,
    byteSize: 192 * 1024,
    moments: [camping, sunrise],
    ...overrides,
  };
}

describe('moment catalogs', () => {
  it('builds an empty shell for a kind', () => {
    const catalog = catalogFromPacks('good', []);

    expect(catalog.title).toBe('Каталог хороших моментов');
    expect(catalog.subtitle).toBe(MOMENT_CATALOG_COPY.subtitle);
    expect(catalog.recent).toBeNull();
    expect(catalog.packs).toEqual([]);
  });

  it('names the bad catalog', () => {
    expect(catalogFromPacks('bad', []).title).toBe('Каталог плохих моментов');
  });
});

describe('parseMomentCatalogKind', () => {
  it('accepts a single good or bad value', () => {
    expect(parseMomentCatalogKind('good')).toBe('good');
    expect(parseMomentCatalogKind(['bad'])).toBe('bad');
  });

  it('rejects anything else', () => {
    expect(parseMomentCatalogKind(undefined)).toBeNull();
    expect(parseMomentCatalogKind('')).toBeNull();
    expect(parseMomentCatalogKind('neutral')).toBeNull();
  });
});

describe('formatObjectCount', () => {
  it('uses Russian plural forms', () => {
    expect(formatObjectCount(1)).toBe('1 объект');
    expect(formatObjectCount(2)).toBe('2 объекта');
    expect(formatObjectCount(5)).toBe('5 объектов');
    expect(formatObjectCount(11)).toBe('11 объектов');
    expect(formatObjectCount(21)).toBe('21 объект');
    expect(formatObjectCount(22)).toBe('22 объекта');
    expect(formatObjectCount(24)).toBe('24 объекта');
  });
});

describe('filterMomentCatalog', () => {
  const good = catalogFromPacks('good', [
    pack(),
    pack({ id: 'forest', title: 'Forest', author: 'Андрей' }),
  ]);

  it('returns the same catalog when the query is blank', () => {
    expect(filterMomentCatalog(good, '  ')).toBe(good);
  });

  it('keeps a pack whose author matches', () => {
    const filtered = filterMomentCatalog(good, 'руслан');

    expect(filtered.packs.map((item) => item.title)).toEqual(['Lights']);
  });

  it('keeps only matching moments when the pack title does not match', () => {
    const filtered = filterMomentCatalog(catalogFromPacks('good', [pack()]), 'sun');

    expect(filtered.packs[0]?.moments.map((moment) => moment.name)).toEqual(['Sunrise']);
  });

  it('returns no sections when nothing matches', () => {
    const filtered = filterMomentCatalog(good, 'zzz');

    expect(filtered.recent).toBeNull();
    expect(filtered.packs).toEqual([]);
  });
});
