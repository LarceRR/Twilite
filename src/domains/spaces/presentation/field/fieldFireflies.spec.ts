import { describe, expect, it } from 'vitest';

import {
  advanceFirefly,
  buildFireflyClusters,
  createFirefly,
  fireflyTargetCount,
  fireflyVisualOpacity,
  FIREFLY_MAX_LIFETIME_SEC,
  type FireflyEmitter,
} from './fieldFireflies';

function emitter(
  id: string,
  x: number,
  y = 0,
  overrides: Partial<FireflyEmitter> = {},
): FireflyEmitter {
  return {
    id,
    x,
    y,
    z: 6,
    color: '#FFAE00',
    intensity: 1.5,
    distance: 180,
    ...overrides,
  };
}

describe('fieldFireflies', () => {
  it('does not create spawn regions without emitting objects', () => {
    expect(buildFireflyClusters([], 60)).toEqual([]);
  });

  it('groups nearby lit objects into one cloud and separates distant sources', () => {
    const clusters = buildFireflyClusters(
      [
        emitter('moment-a', 0),
        emitter('moment-b', 61, 0, { color: '#FF5911' }),
        emitter('moment-c', 122),
        emitter('remote-moment', 520),
      ],
      60,
    );

    expect(clusters).toHaveLength(2);
    expect(clusters.find((cluster) => cluster.emitterCount === 3)).toMatchObject({
      emitterCount: 3,
      x: expect.any(Number),
      y: expect.any(Number),
    });
    expect(clusters.reduce((sum, cluster) => sum + fireflyTargetCount(cluster), 0))
      .toBeGreaterThan(6);
  });

  it('keeps every fly within its ten-second maximum lifetime', () => {
    const [cluster] = buildFireflyClusters([emitter('moment-a', 0)], 60);
    expect(cluster).toBeDefined();

    const fly = createFirefly(1, cluster!, 60);
    expect(fly.lifetimeSec).toBeGreaterThan(3);
    expect(fly.lifetimeSec).toBeLessThanOrEqual(FIREFLY_MAX_LIFETIME_SEC);
  });

  it('moves in 3D and updates a finite, fading local light', () => {
    const [cluster] = buildFireflyClusters(
      [emitter('moment-a', 0), emitter('moment-b', 61)],
      60,
    );
    expect(cluster).toBeDefined();

    const fly = createFirefly(23, cluster!, 60);
    const start = { x: fly.x, y: fly.y, z: fly.z };
    for (let index = 0; index < 20; index += 1) advanceFirefly(fly, 0.05);

    expect(Math.hypot(fly.x - start.x, fly.y - start.y, fly.z - start.z)).toBeGreaterThan(0);
    expect(fly.light.x).toBe(fly.x);
    expect(fly.light.y).toBe(fly.y);
    expect(fly.light.z).toBe(fly.z);
    expect(Number.isFinite(fly.light.intensity)).toBe(true);
    expect(fly.light.intensity).toBeGreaterThan(0);
    expect(fireflyVisualOpacity(fly)).toBeGreaterThan(0);
    expect(fireflyVisualOpacity(fly)).toBeLessThanOrEqual(1);
  });
});
