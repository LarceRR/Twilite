import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  ShapeGeometry,
} from 'three';

export const PLATFORM_CORNER_RADIUS = 3;
export const PLATFORM_EDGE_BEVEL = 1;

function safeDimension(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0.001, value) : fallback;
}

/** Creates a square footprint with only its four corners rounded. */
export function createRoundedSquareShape(size: number, cornerRadius: number): Shape {
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

type UvPoint = { readonly u: number; readonly v: number };

/**
 * UV atlas layout:
 * - large central island: top face
 * - thin strips around it: four sides including their edge bevels
 * - small lower-left island: underside
 */
function mapPlatformUv(
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
  size: number,
  minZ: number,
  maxZ: number,
): UvPoint {
  const topStart = 0.2;
  const topSize = 0.6;
  const sideWidth = 0.06;
  const xAlong = Math.max(0, Math.min(1, x / size + 0.5));
  const yAlong = Math.max(0, Math.min(1, y / size + 0.5));
  const vertical = Math.max(0, Math.min(1, (maxZ - z) / Math.max(0.001, maxZ - minZ)));

  if (nz > 0.72) {
    return { u: topStart + xAlong * topSize, v: topStart + yAlong * topSize };
  }
  if (nz < -0.72) {
    return { u: 0.02 + xAlong * 0.16, v: 0.02 + yAlong * 0.16 };
  }

  if (Math.abs(ny) >= Math.abs(nx)) {
    return ny >= 0
      ? { u: topStart + xAlong * topSize, v: topStart + topSize + vertical * sideWidth }
      : { u: topStart + xAlong * topSize, v: topStart - vertical * sideWidth };
  }

  return nx >= 0
    ? { u: topStart + topSize + vertical * sideWidth, v: topStart + yAlong * topSize }
    : { u: topStart - vertical * sideWidth, v: topStart + yAlong * topSize };
}

/** One geometry is reused for every cell. Instance elevation never scales its thickness. */
export function createRoundedSquarePlatformGeometry(
  size: number,
  height: number,
  cornerRadius = PLATFORM_CORNER_RADIUS,
  edgeBevel = PLATFORM_EDGE_BEVEL,
): BufferGeometry {
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
  const shapeRadius = Math.max(0, Math.min(cornerRadius - bevel, shapeSize / 2));
  const shape = createRoundedSquareShape(shapeSize, shapeRadius);
  const extruded = new ExtrudeGeometry(shape, {
    depth: bodyDepth,
    bevelEnabled,
    bevelSegments: bevelEnabled ? 2 : 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    steps: 1,
    curveSegments: 3,
  });
  const geometry: BufferGeometry =
    extruded.index === null ? extruded : extruded.toNonIndexed();
  if (geometry !== extruded) extruded.dispose();

  geometry.translate(0, 0, -safeHeight / 2 + bevel);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const uv = new Float32Array(positions.count * 2);
  const minZ = geometry.boundingBox?.min.z ?? -safeHeight / 2;
  const maxZ = geometry.boundingBox?.max.z ?? safeHeight / 2;

  for (let triangleStart = 0; triangleStart < positions.count; triangleStart += 3) {
    const nx =
      (normals.getX(triangleStart) + normals.getX(triangleStart + 1) + normals.getX(triangleStart + 2)) / 3;
    const ny =
      (normals.getY(triangleStart) + normals.getY(triangleStart + 1) + normals.getY(triangleStart + 2)) / 3;
    const nz =
      (normals.getZ(triangleStart) + normals.getZ(triangleStart + 1) + normals.getZ(triangleStart + 2)) / 3;

    for (let offset = 0; offset < 3; offset += 1) {
      const index = triangleStart + offset;
      const mapped = mapPlatformUv(
        positions.getX(index),
        positions.getY(index),
        positions.getZ(index),
        nx,
        ny,
        nz,
        safeSize,
        minZ,
        maxZ,
      );
      uv[index * 2] = mapped.u;
      uv[index * 2 + 1] = mapped.v;
    }
  }

  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.computeBoundingSphere();
  return geometry;
}

/** UV guide generated directly from the same geometry/UV attribute as the live tiles. */
export function createRoundedSquarePlatformUvSvg(
  size: number,
  thickness: number,
  cornerRadius = PLATFORM_CORNER_RADIUS,
  edgeBevel = PLATFORM_EDGE_BEVEL,
): string {
  const geometry = createRoundedSquarePlatformGeometry(size, thickness, cornerRadius, edgeBevel);
  try {
    const uv = geometry.getAttribute('uv');
    const edges = new Map<string, { a: UvPoint; b: UvPoint; count: number }>();
    const keyOf = (point: UvPoint): string =>
      Math.round(point.u * 10000) + ',' + Math.round(point.v * 10000);

    const addEdge = (a: UvPoint, b: UvPoint): void => {
      const aKey = keyOf(a);
      const bKey = keyOf(b);
      const key = aKey < bKey ? aKey + '|' + bKey : bKey + '|' + aKey;
      const existing = edges.get(key);
      if (existing !== undefined) {
        existing.count += 1;
      } else {
        edges.set(key, { a, b, count: 1 });
      }
    };

    for (let index = 0; index < uv.count; index += 3) {
      const a = { u: uv.getX(index), v: uv.getY(index) };
      const b = { u: uv.getX(index + 1), v: uv.getY(index + 1) };
      const c = { u: uv.getX(index + 2), v: uv.getY(index + 2) };
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }

    const canvasSize = 1080;
    const padding = 40;
    const mapSize = canvasSize - padding * 2;
    const lines: string[] = [];
    for (const edge of edges.values()) {
      if (edge.count !== 1) continue;
      const x1 = padding + edge.a.u * mapSize;
      const y1 = padding + (1 - edge.a.v) * mapSize;
      const x2 = padding + edge.b.u * mapSize;
      const y2 = padding + (1 - edge.b.v) * mapSize;
      lines.push(
        '<line x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) +
          '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) + '" />',
      );
    }

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + canvasSize +
        '" height="' + canvasSize + '" viewBox="0 0 ' + canvasSize + ' ' + canvasSize + '">',
      '<rect width="100%" height="100%" fill="#FFFFFF" />',
      '<g fill="none" stroke="#202020" stroke-width="2" stroke-linecap="square" stroke-linejoin="round">',
      ...lines,
      '</g>',
      '</svg>',
    ].join('\n');
  } finally {
    geometry.dispose();
  }
}

/** Top-only surface geometry for the object's pixel-wave overlay. */
export function createRoundedSquareTopGeometry(
  size: number,
  cornerRadius = PLATFORM_CORNER_RADIUS,
): ShapeGeometry {
  const geometry = new ShapeGeometry(createRoundedSquareShape(size, cornerRadius), 3);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
