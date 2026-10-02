import { beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceObject } from '../../domain/entities/SurfaceObject';
import { useSurfaceObjectsStore } from './surfaceObjectsStore';

function object(
  id: string,
  version: number,
  cell: { x: number; y: number } = { x: 0, y: 0 },
  spaceId = 'space-a',
): SurfaceObject {
  return {
    id,
    spaceId,
    surfaceId: 'surface',
    cell,
    kind: 'Fire',
    state: 'Active',
    createdByUserId: 'u1',
    subjectUserId: 'u2',
    metadata: {},
    favorite: false,
    createdAt: Number(id.replace(/\D/g, '')) || 1,
    updatedAt: 1,
    version,
  } as unknown as SurfaceObject;
}

const store = () => useSurfaceObjectsStore.getState();

describe('surfaceObjectsStore', () => {
  beforeEach(() => store().clear());

  it('ignores out-of-order updates with a lower version', () => {
    store().replaceAll([object('o1', 3)], { spaceId: 'space-a', syncedAt: 10 });
    store().upsert(object('o1', 2));

    expect(store().byId.o1?.version).toBe(3);
  });

  it('does not let a re-delivered cached snapshot wipe newer realtime objects', () => {
    store().replaceAll([object('o1', 1)], { spaceId: 'space-a', syncedAt: 10 });
    store().upsert(object('o2', 1, { x: 1, y: 1 }));
    store().replaceAll([object('o1', 1)], { spaceId: 'space-a', syncedAt: 10 });

    expect(store().order).toEqual(['o1', 'o2']);
  });

  it('applies a newer snapshot as the authority', () => {
    store().replaceAll([object('o1', 1)], { spaceId: 'space-a', syncedAt: 10 });
    store().upsert(object('o2', 1, { x: 1, y: 1 }));
    store().replaceAll([object('o1', 1)], { spaceId: 'space-a', syncedAt: 20 });

    expect(store().order).toEqual(['o1']);
  });

  it('drops late events that belong to another space', () => {
    store().replaceAll([object('o1', 1)], { spaceId: 'space-a', syncedAt: 10 });
    store().upsert(object('o9', 1, { x: 3, y: 3 }, 'space-b'));

    expect(store().byId.o9).toBeUndefined();
  });

  it('frees the old cell when an object moves', () => {
    store().replaceAll([object('o1', 1, { x: 0, y: 0 })], { spaceId: 'space-a', syncedAt: 10 });
    store().upsert(object('o1', 2, { x: 2, y: 4 }));

    expect(store().byCell['0:0']).toBeUndefined();
    expect(store().byCell['2:4']).toBe('o1');
  });
});
