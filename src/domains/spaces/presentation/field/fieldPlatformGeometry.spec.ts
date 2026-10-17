import { describe, expect, it } from 'vitest';

import {
  createRoundedSquarePlatformGeometry,
  createRoundedSquarePlatformUvSvg,
  createRoundedSquareShape,
  createRoundedSquareTopGeometry,
} from './fieldPlatformGeometry';

describe('rounded square platform geometry', () => {
  it('keeps the tile square while rounding only its corners', () => {
    const shape = createRoundedSquareShape(60, 3);
    const points = shape.extractPoints(3).shape;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    expect(Math.min(...xs)).toBe(-30);
    expect(Math.max(...xs)).toBe(30);
    expect(Math.min(...ys)).toBe(-30);
    expect(Math.max(...ys)).toBe(30);
    expect(points.length).toBeGreaterThan(4);
  });

  it('creates a closed, bevelled solid with finite normals', () => {
    const geometry = createRoundedSquarePlatformGeometry(60, 16, 3, 1);
    geometry.computeBoundingBox();

    expect(geometry.boundingBox).not.toBeNull();
    expect(geometry.boundingBox!.min.z).toBeCloseTo(-8, 4);
    expect(geometry.boundingBox!.max.z).toBeCloseTo(8, 4);

    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    expect(positions.count).toBeGreaterThan(0);
    expect(normals.count).toBe(positions.count);

    let horizontalFaceNormals = 0;
    let sideFaceNormals = 0;

    for (let index = 0; index < normals.count; index += 1) {
      const nx = normals.getX(index);
      const ny = normals.getY(index);
      const nz = normals.getZ(index);

      expect(Number.isFinite(nx) && Number.isFinite(ny) && Number.isFinite(nz)).toBe(true);

      if (Math.abs(nz) > 0.9) horizontalFaceNormals += 1;
      if (Math.abs(nz) < 0.5) sideFaceNormals += 1;
    }

    expect(horizontalFaceNormals).toBeGreaterThan(0);
    expect(sideFaceNormals).toBeGreaterThan(0);
    geometry.dispose();
  });

  it('allows a perfectly square, sharp-cornered tile', () => {
    const geometry = createRoundedSquarePlatformGeometry(60, 6, 0, 0);
    geometry.computeBoundingBox();

    expect(geometry.boundingBox?.min.x).toBe(-30);
    expect(geometry.boundingBox?.max.x).toBe(30);
    expect(geometry.boundingBox?.min.y).toBe(-30);
    expect(geometry.boundingBox?.max.y).toBe(30);
    expect(geometry.boundingBox?.min.z).toBe(-3);
    expect(geometry.boundingBox?.max.z).toBe(3);
    geometry.dispose();
  });

  it('creates normalized UV coordinates and an export generated from the same geometry', () => {
    const geometry = createRoundedSquarePlatformGeometry(60, 6, 3, 1);
    const uv = geometry.getAttribute('uv');

    expect(uv.count).toBe(geometry.getAttribute('position').count);
    for (let index = 0; index < uv.count; index += 1) {
      expect(uv.getX(index)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(index)).toBeLessThanOrEqual(1);
      expect(uv.getY(index)).toBeGreaterThanOrEqual(0);
      expect(uv.getY(index)).toBeLessThanOrEqual(1);
    }

    const svg = createRoundedSquarePlatformUvSvg(60, 6, 3, 1);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<line ');
    expect(svg).toContain('width="1080"');
    geometry.dispose();
  });

  it('creates a matching top-only surface with rounded corners', () => {
    const geometry = createRoundedSquareTopGeometry(60, 3);
    geometry.computeBoundingBox();

    expect(geometry.boundingBox?.min.x).toBe(-30);
    expect(geometry.boundingBox?.max.x).toBe(30);
    expect(geometry.boundingBox?.min.y).toBe(-30);
    expect(geometry.boundingBox?.max.y).toBe(30);
    expect(geometry.boundingBox?.min.z).toBe(0);
    expect(geometry.boundingBox?.max.z).toBe(0);
    geometry.dispose();
  });
});
