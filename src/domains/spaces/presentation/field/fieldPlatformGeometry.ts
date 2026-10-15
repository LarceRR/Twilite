import {
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
} from 'three';

export const PLATFORM_CORNER_RADIUS = 3;
export const PLATFORM_EDGE_BEVEL = 1;

function safeDimension(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0.001, value) : fallback;
}

/**
 * Creates a square footprint with small controllable rounded corners.
 * The sides remain straight and square; only the corner arcs are rounded.
 */
export function createRoundedSquareShape(
  size: number,
  cornerRadius: number,
): Shape {
  const safeSize = safeDimension(size, 1);
  const half = safeSize / 2;
  const radius = Math.min(
    Math.max(0, Number.isFinite(cornerRadius) ? cornerRadius : 0),
    half,
  );
  const shape = new Shape();

  if (radius <= 0) {
    shape.moveTo(-half, -half);
    shape.lineTo(half, -half);
    shape.lineTo(half, half);
    shape.lineTo(-half, half);
    shape.closePath();
    return shape;
  }

  shape.moveTo(-half + radius, -half);
  shape.lineTo(half - radius, -half);
  shape.quadraticCurveTo(half, -half, half, -half + radius);
  shape.lineTo(half, half - radius);
  shape.quadraticCurveTo(half, half, half - radius, half);
  shape.lineTo(-half + radius, half);
  shape.quadraticCurveTo(-half, half, -half, half - radius);
  shape.lineTo(-half, -half + radius);
  shape.quadraticCurveTo(-half, -half, -half + radius, -half);
  shape.closePath();

  return shape;
}

/**
 * Creates one closed, bevelled square tile.
 *
 * A single ExtrudeGeometry owns the top, bottom and sides. The bevel is real
 * geometry, not a transparent overlay, so no coplanar faces can z-fight.
 */
export function createRoundedSquarePlatformGeometry(
  size: number,
  height: number,
  cornerRadius = PLATFORM_CORNER_RADIUS,
  edgeBevel = PLATFORM_EDGE_BEVEL,
): ExtrudeGeometry {
  const safeSize = safeDimension(size, 1);
  const safeHeight = safeDimension(height, 1);
  const bevel = Math.min(
    Math.max(0, Number.isFinite(edgeBevel) ? edgeBevel : 0),
    safeSize * 0.1,
    safeHeight * 0.24,
  );
  const bevelEnabled = bevel > 0;
  const bodyDepth = Math.max(0.001, safeHeight - bevel * 2);
  const shapeSize = bevelEnabled ? safeSize - bevel * 2 : safeSize;
  const shapeRadius = Math.max(
    0,
    Math.min(cornerRadius - bevel, shapeSize / 2),
  );
  const shape = createRoundedSquareShape(shapeSize, shapeRadius);

  const geometry = new ExtrudeGeometry(shape, {
    depth: bodyDepth,
    bevelEnabled,
    bevelSegments: bevelEnabled ? 2 : 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    steps: 1,
    curveSegments: 3,
  });

  geometry.translate(0, 0, -safeHeight / 2 + bevel);
  const uv = geometry.getAttribute('uv');
  if (uv !== undefined && geometry.getAttribute('uv1') === undefined) {
    geometry.setAttribute('uv1', uv.clone());
  }
  const uv = geometry.getAttribute('uv');
  if (uv !== undefined && geometry.getAttribute('uv1') === undefined) {
    geometry.setAttribute('uv1', uv.clone());
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

/** Top-only surface for the pixel-light and wave shader. */
export function createRoundedSquareTopGeometry(
  size: number,
  cornerRadius = PLATFORM_CORNER_RADIUS,
): ShapeGeometry {
  const shape = createRoundedSquareShape(size, cornerRadius);
  const geometry = new ShapeGeometry(shape, 3);

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
