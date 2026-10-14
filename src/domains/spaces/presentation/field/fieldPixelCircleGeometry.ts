import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
} from 'three';

export const PLATFORM_PIXEL_CIRCLE_STEPS = 24;

type Vertex = readonly [x: number, y: number, z: number, u: number, v: number];
type RowSpan = { readonly start: number; readonly end: number };

/**
 * A symmetric circle mask on a square pixel grid. Pixel centers are tested
 * against the circle so the silhouette stays hard-edged, like a Minecraft circle.
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

function createPixelCircleShape(size: number, resolution: number): Shape {
  const mask = createPixelCircleMask(resolution);
  const steps = mask.length;
  const spans = mask.map((_, row) => findRowSpan(mask, row));
  if (spans.some((span) => span === null)) {
    throw new Error('Pixel circle must contain at least one filled cell in every row');
  }

  const halfSize = size / 2;
  const pixelSize = size / steps;
  const xAt = (column: number): number => column * pixelSize - halfSize;
  const yAt = (row: number): number => row * pixelSize - halfSize;
  const first = spans[0]!;
  const last = spans[steps - 1]!;
  if (first === null || last === null) {
    throw new Error('Pixel circle has an empty boundary row');
  }

  // Trace the actual staircase boundary once. ExtrudeGeometry then creates one
  // closed solid with consistent cap/side topology instead of overlapping quads.
  const shape = new Shape();
  shape.moveTo(xAt(first.start), yAt(0));
  shape.lineTo(xAt(first.end), yAt(0));

  for (let row = 0; row < steps; row += 1) {
    const current = spans[row]!;
    if (current === null) throw new Error('Pixel circle has an empty row');
    shape.lineTo(xAt(current.end), yAt(row + 1));

    const next = spans[row + 1];
    if (next !== undefined && next !== null && next.end !== current.end) {
      shape.lineTo(xAt(next.end), yAt(row + 1));
    }
  }

  shape.lineTo(xAt(last.start), yAt(steps));

  for (let row = steps - 1; row >= 0; row -= 1) {
    const current = spans[row]!;
    if (current === null) throw new Error('Pixel circle has an empty row');
    shape.lineTo(xAt(current.start), yAt(row));

    const previous = spans[row - 1];
    if (previous !== undefined && previous !== null && previous.start !== current.start) {
      shape.lineTo(xAt(previous.start), yAt(row));
    }
  }

  shape.closePath();
  return shape;
}

/**
 * Makes one closed, hard-edged solid. ExtrudeGeometry owns the cap triangulation
 * and wall normals; no transparent coplanar side mesh or manually patched normals.
 */
export function createPixelCirclePlatformGeometry(
  size: number,
  height: number,
  resolution = PLATFORM_PIXEL_CIRCLE_STEPS,
): ExtrudeGeometry {
  const safeSize = Number.isFinite(size) ? Math.max(0.001, size) : 1;
  const safeHeight = Number.isFinite(height) ? Math.max(0.001, height) : 1;
  const shape = createPixelCircleShape(safeSize, resolution);
  const geometry = new ExtrudeGeometry(shape, {
    depth: safeHeight,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });

  geometry.translate(0, 0, -safeHeight / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
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

/** Top-only matching geometry clips the pixel-light/wave overlay to the same circle. */
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
