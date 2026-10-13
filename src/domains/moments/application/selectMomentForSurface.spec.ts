import { describe, expect, it } from 'vitest';

import { spaceId } from '@/domains/spaces/domain/value-objects/SpaceId';

import { selectMomentForSurface } from './selectMomentForSurface';

describe('selectMomentForSurface', () => {
  it('maps good catalog moments to Fire and preserves idempotency', () => {
    expect(
      selectMomentForSurface({
        spaceId: spaceId('space-1'),
        kind: 'good',
        momentId: 'pixel-1',
        idempotencyKey: 'request-1',
      }),
    ).toEqual({
      spaceId: 'space-1',
      kind: 'Fire',
      pixelObjectId: 'pixel-1',
      idempotencyKey: 'request-1',
    });
  });

  it('maps bad catalog moments to Cloud without accepting client coordinates', () => {
    const input = selectMomentForSurface({
      spaceId: spaceId('space-1'),
      kind: 'bad',
      momentId: 'pixel-2',
      idempotencyKey: 'request-2',
    });

    expect(input.kind).toBe('Cloud');
    expect(input).not.toHaveProperty('cellX');
    expect(input).not.toHaveProperty('cellY');
  });
});
