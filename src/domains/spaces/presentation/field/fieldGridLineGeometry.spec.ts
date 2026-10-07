import { describe, expect, it } from 'vitest';

import { createFieldGridConfig } from './fieldGridConfig';
import {
  buildFieldGridLinePositions,
  fieldGridLineSegmentCount,
} from './fieldGridLineGeometry';

describe('fieldGridLineGeometry', () => {
  const config = createFieldGridConfig(50, 21, 60);

  it('emits one segment per grid line (51 vertical + 22 horizontal)', () => {
    expect(fieldGridLineSegmentCount(config)).toBe(73);
    const positions = buildFieldGridLinePositions(config);
    expect(positions.length).toBe(73 * 2 * 3);
  });

  it('spans x∈[0,3000] and y∈[-630,630] on the XY ground', () => {
    const positions = buildFieldGridLinePositions(config, 0.5);
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (let i = 0; i < positions.length; i += 3) {
      expect(positions[i + 2]).toBe(0.5);
      xs.add(positions[i]!);
      ys.add(positions[i + 1]!);
    }
    expect(xs.has(0)).toBe(true);
    expect(xs.has(3000)).toBe(true);
    expect(ys.has(-630)).toBe(true);
    expect(ys.has(630)).toBe(true);
  });

  it('offsets a streamed chunk onto absolute +X', () => {
    const chunk = createFieldGridConfig(10, 21, 60);
    const positions = buildFieldGridLinePositions(chunk, 0.5, 10);
    const xs = new Set<number>();
    for (let i = 0; i < positions.length; i += 3) xs.add(positions[i]!);
    expect(xs.has(600)).toBe(true);
    expect(xs.has(1200)).toBe(true);
    expect(xs.has(0)).toBe(false);
  });
});
