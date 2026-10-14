import { BufferGeometry, Float32BufferAttribute } from 'three';

export const PLATFORM_PIXEL_CIRCLE_STEPS = 24;

type Vertex = readonly [x: number, y: number, z: number, u: number, v: number];
type RowSpan = { readonly start: number; readonly end: number };

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

  return Array.from({ length: steps }, (_, row) =>
    Array.from({ length: steps }, (_, column) => {
      const x = column + 0.5 - radius;
      const y = row + 0.5 - radius;
      return x * x + y * y <= radius * radius;
    }),
  );
}

function findRowSpan(mask: readonly (readonly boolean[])[], row: number): RowSpan | null {
  const cells = mask[row]!;
  let start = -1;
  let end = -1;

  for (let column = 0; column < cells.length; column += 1) {
    if (!cells[column]) continue;
    if (start < 0) start = column;
    end = column + 1;
  }

  return start < 0 ? null : { start, end };
}

function pushTriangle(vertices: Vertex[], a: Vertex, b: Vertex, c: Vertex): void {
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

/** Builds a hard-edged pixel circle with a closed vertical extrusion. */
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
    const span = findRowSpan(mask, row);
    if (span === null) continue;

    // One rectangle per row covers the same pixel footprint as the mask,
    // reducing the top/bottom mesh from hundreds of quads to O(resolution).
    const topBl = pixelVertex(size, steps, span.start, row, upperZ);
    const topBr = pixelVertex(size, steps, span.end, row, upperZ);
    const topTr = pixelVertex(size, steps, span.end, row + 1, upperZ);
    const topTl = pixelVertex(size, steps, span.start, row + 1, upperZ);
    pushQuad(vertices, topBl, topBr, topTr, topTl);

    const bottomBl = pixelVertex(size, steps, span.start, row, lowerZ);
    const bottomBr = pixelVertex(size, steps, span.end, row, lowerZ);
    const bottomTr = pixelVertex(size, steps, span.end, row + 1, lowerZ);
    const bottomTl = pixelVertex(size, steps, span.start, row + 1, lowerZ);
    // Reverse winding for the underside.
    pushQuad(vertices, bottomBl, bottomTl, bottomTr, bottomBr);

    for (let column = span.start; column < span.end; column += 1) {
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

/** Top-only matching geometry clips the overlay to the same pixel circle. */
export function createPixelCircleTopGeometry(
  size: number,
  resolution = PLATFORM_PIXEL_CIRCLE_STEPS,
): BufferGeometry {
  const mask = createPixelCircleMask(resolution);
  const steps = mask.length;
  const vertices: Vertex[] = [];

  for (let row = 0; row < steps; row += 1) {
    const span = findRowSpan(mask, row);
    if (span === null) continue;
    pushQuad(
      vertices,
      pixelVertex(size, steps, span.start, row, 0),
      pixelVertex(size, steps, span.end, row, 0),
      pixelVertex(size, steps, span.end, row + 1, 0),
      pixelVertex(size, steps, span.start, row + 1, 0),
    );
  }

  return toGeometry(vertices);
}
