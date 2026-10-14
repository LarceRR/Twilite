import { BufferGeometry, Float32BufferAttribute } from 'three';

export const PLATFORM_PIXEL_CIRCLE_STEPS = 24;

type Vertex = readonly [x: number, y: number, z: number, u: number, v: number];

/**
 * A symmetric circle mask on a square pixel grid. Pixel centers are tested
 * against the circle so the silhouette stays hard-edged and touches each
 * side of its containing square, just like a Minecraft pixel-art circle.
 */
export function createPixelCircleMask(
  resolution = PLATFORM_PIXEL_CIRCLE_STEPS,
): readonly (readonly boolean[])[] {
  const steps = Number.isFinite(resolution)
    ? Math.max(4, Math.floor(resolution))
    : PLATFORM_PIXEL_CIRCLE_STEPS;
  const radius = steps / 2;
  const center = radius;

  return Array.from({ length: steps }, (_, row) =>
    Array.from({ length: steps }, (_, column) => {
      const x = column + 0.5 - center;
      const y = row + 0.5 - center;
      return x * x + y * y <= radius * radius;
    }),
  );
}

function pushTriangle(
  vertices: Vertex[],
  a: Vertex,
  b: Vertex,
  c: Vertex,
): void {
  vertices.push(a, b, c);
}

function pushQuad(
  vertices: Vertex[],
  bottomLeft: Vertex,
  bottomRight: Vertex,
  topRight: Vertex,
  topLeft: Vertex,
): void {
  pushTriangle(vertices, bottomLeft, bottomRight, topRight);
  pushTriangle(vertices, bottomLeft, topRight, topLeft);
}

function toGeometry(vertices: readonly Vertex[]): BufferGeometry {
  const positions = new Float32Array(vertices.length * 3);
  const uvs = new Float32Array(vertices.length * 2);

  vertices.forEach(([x, y, z, u, v], index) => {
    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
    uvs[index * 2] = u;
    uvs[index * 2 + 1] = v;
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function pixelVertex(
  size: number,
  resolution: number,
  column: number,
  row: number,
  z: number,
): Vertex {
  const cellSize = size / resolution;
  return [
    -size / 2 + column * cellSize,
    -size / 2 + row * cellSize,
    z,
    column / resolution,
    row / resolution,
  ];
}

/** Builds a hard-edged, symmetric pixel circle with a vertical extruded side wall. */
export function createPixelCirclePlatformGeometry(
  size: number,
  height: number,
  resolution = PLATFORM_PIXEL_CIRCLE_STEPS,
): BufferGeometry {
  const mask = createPixelCircleMask(resolution);
  const steps = mask.length;
  const lowerZ = -height / 2;
  const upperZ = height / 2;
  const vertices: Vertex[] = [];

  for (let row = 0; row < steps; row += 1) {
    for (let column = 0; column < steps; column += 1) {
      if (!mask[row]![column]) continue;

      const bl = pixelVertex(size, steps, column, row, upperZ);
      const br = pixelVertex(size, steps, column + 1, row, upperZ);
      const tr = pixelVertex(size, steps, column + 1, row + 1, upperZ);
      const tl = pixelVertex(size, steps, column, row + 1, upperZ);
      // Top points upward.
      pushQuad(vertices, bl, br, tr, tl);

      const bottomBl = pixelVertex(size, steps, column, row, lowerZ);
      const bottomBr = pixelVertex(size, steps, column + 1, row, lowerZ);
      const bottomTr = pixelVertex(size, steps, column + 1, row + 1, lowerZ);
      const bottomTl = pixelVertex(size, steps, column, row + 1, lowerZ);
      // Reverse winding for the underside.
      pushQuad(vertices, bottomBl, bottomTl, bottomTr, bottomBr);

      if (column === 0 || !mask[row]![column - 1]) {
        pushQuad(
          vertices,
          pixelVertex(size, steps, column, row, lowerZ),
          pixelVertex(size, steps, column, row, upperZ),
          pixelVertex(size, steps, column, row + 1, upperZ),
          pixelVertex(size, steps, column, row + 1, lowerZ),
        );
      }
      if (column === steps - 1 || !mask[row]![column + 1]) {
        pushQuad(
          vertices,
          pixelVertex(size, steps, column + 1, row, lowerZ),
          pixelVertex(size, steps, column + 1, row + 1, lowerZ),
          pixelVertex(size, steps, column + 1, row + 1, upperZ),
          pixelVertex(size, steps, column + 1, row, upperZ),
        );
      }
      if (row === 0 || !mask[row - 1]![column]) {
        pushQuad(
          vertices,
          pixelVertex(size, steps, column, row, lowerZ),
          pixelVertex(size, steps, column + 1, row, lowerZ),
          pixelVertex(size, steps, column + 1, row, upperZ),
          pixelVertex(size, steps, column, row, upperZ),
        );
      }
      if (row === steps - 1 || !mask[row + 1]![column]) {
        pushQuad(
          vertices,
          pixelVertex(size, steps, column, row + 1, lowerZ),
          pixelVertex(size, steps, column, row + 1, upperZ),
          pixelVertex(size, steps, column + 1, row + 1, upperZ),
          pixelVertex(size, steps, column + 1, row + 1, lowerZ),
        );
      }
    }
  }

  return toGeometry(vertices);
}

/** Top-only matching geometry clips the pixel-light/wave overlay to the same circle. */
export function createPixelCircleTopGeometry(
  size: number,
  resolution = PLATFORM_PIXEL_CIRCLE_STEPS,
): BufferGeometry {
  const mask = createPixelCircleMask(resolution);
  const steps = mask.length;
  const vertices: Vertex[] = [];

  for (let row = 0; row < steps; row += 1) {
    for (let column = 0; column < steps; column += 1) {
      if (!mask[row]![column]) continue;
      const bl = pixelVertex(size, steps, column, row, 0);
      const br = pixelVertex(size, steps, column + 1, row, 0);
      const tr = pixelVertex(size, steps, column + 1, row + 1, 0);
      const tl = pixelVertex(size, steps, column, row + 1, 0);
      pushQuad(vertices, bl, br, tr, tl);
    }
  }

  return toGeometry(vertices);
}
