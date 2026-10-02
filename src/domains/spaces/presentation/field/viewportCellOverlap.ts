export type ViewPoint = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

type PlanePoint = {
  readonly x: number;
  readonly y: number;
};

const NDC_RECT: readonly PlanePoint[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
];

const SEPARATION_EPSILON = 1e-4;
const PLANE_EPSILON = 1e-4;

export function polygonOverlapsNdc(polygon: readonly PlanePoint[]): boolean {
  if (polygon.length < 3) return false;
  return ndcAxes(polygon).every((axis) => intervalsOverlap(polygon, NDC_RECT, axis));
}

export function clipViewPolygon(
  polygon: readonly ViewPoint[],
  near: number,
  far: number,
): ViewPoint[] {
  const inFront = clipHalfSpace(
    polygon,
    (point) => point.z <= -near + PLANE_EPSILON,
    (from, to) => intersectAtZ(from, to, -near),
  );
  return clipHalfSpace(
    inFront,
    (point) => point.z >= -far - PLANE_EPSILON,
    (from, to) => intersectAtZ(from, to, -far),
  );
}

export function viewPolygonOverlapsViewport(
  viewPoints: readonly ViewPoint[],
  near: number,
  far: number,
  projection: ArrayLike<number>,
): boolean {
  const clipped = clipViewPolygon(viewPoints, near, far);
  const ndc = clipped.map((point) => projectViewToNdc(point, projection));
  return polygonOverlapsNdc(ndc);
}

export function transformPoint(elements: ArrayLike<number>, point: ViewPoint): ViewPoint {
  const w = elements[3] * point.x + elements[7] * point.y + elements[11] * point.z + elements[15];
  const inv = 1 / (Math.abs(w) < 1e-8 ? (w < 0 ? -1e-8 : 1e-8) : w);
  return {
    x: (elements[0] * point.x + elements[4] * point.y + elements[8] * point.z + elements[12]) * inv,
    y: (elements[1] * point.x + elements[5] * point.y + elements[9] * point.z + elements[13]) * inv,
    z:
      (elements[2] * point.x + elements[6] * point.y + elements[10] * point.z + elements[14]) * inv,
  };
}

function projectViewToNdc(point: ViewPoint, elements: ArrayLike<number>): PlanePoint {
  const clip = transformPoint(elements, point);
  return { x: clip.x, y: clip.y };
}

function ndcAxes(polygon: readonly PlanePoint[]): PlanePoint[] {
  const axes: PlanePoint[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ];
  for (let index = 0; index < polygon.length; index += 1) {
    const from = polygon[index];
    const to = polygon[(index + 1) % polygon.length];
    if (!from || !to) continue;
    const edge = edgeNormal(from, to);
    if (edge) axes.push(edge);
  }
  return axes;
}

function edgeNormal(from: PlanePoint, to: PlanePoint): PlanePoint | null {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const length = Math.hypot(x, y);
  if (length < 1e-8) return null;
  return { x: -y / length, y: x / length };
}

function intervalsOverlap(
  left: readonly PlanePoint[],
  right: readonly PlanePoint[],
  axis: PlanePoint,
): boolean {
  const [leftMin, leftMax] = projectSpan(left, axis);
  const [rightMin, rightMax] = projectSpan(right, axis);
  return leftMax >= rightMin - SEPARATION_EPSILON && rightMax >= leftMin - SEPARATION_EPSILON;
}

function projectSpan(points: readonly PlanePoint[], axis: PlanePoint): readonly [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    const dot = point.x * axis.x + point.y * axis.y;
    min = Math.min(min, dot);
    max = Math.max(max, dot);
  }
  return [min, max];
}

function clipHalfSpace(
  polygon: readonly ViewPoint[],
  inside: (point: ViewPoint) => boolean,
  intersect: (from: ViewPoint, to: ViewPoint) => ViewPoint,
): ViewPoint[] {
  if (polygon.length === 0) return [];
  const clipped: ViewPoint[] = [];
  let previous = polygon[polygon.length - 1];
  if (!previous) return [];
  let previousInside = inside(previous);
  for (const current of polygon) {
    const currentInside = inside(current);
    if (currentInside !== previousInside) clipped.push(intersect(previous, current));
    if (currentInside) clipped.push(current);
    previous = current;
    previousInside = currentInside;
  }
  return clipped;
}

function intersectAtZ(from: ViewPoint, to: ViewPoint, z: number): ViewPoint {
  const delta = to.z - from.z;
  const t = Math.abs(delta) < 1e-8 ? 0 : (z - from.z) / delta;
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z,
  };
}
