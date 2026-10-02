import { Color, DoubleSide, ShaderMaterial, Vector2 } from 'three';

import { SURFACE_CELL_WORLD_SIZE, surfaceVisual } from './constants';
import { gridColorFor } from './surfaceTheme';

const vertexShader = /* glsl */ `
varying vec3 vWorldPosition;
varying float vFogDepth;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorldPosition = w.xyz;
  vec4 m = viewMatrix * w;
  vFogDepth = -m.z;
  gl_Position = projectionMatrix * m;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 fillColor;
uniform vec3 gridColor;
uniform vec3 fogColor;
uniform vec3 firstColor;
uniform vec3 lastColor;
uniform vec2 firstCell;
uniform vec2 lastCell;
uniform float hasFirst;
uniform float hasLast;
uniform float cellSize;
uniform float fogNear;
uniform float fogFar;
uniform float showGrid;
uniform float roundCells;
uniform float objectsOnly;
uniform vec2 occupiedCells[64];
uniform float occupiedCount;

varying vec3 vWorldPosition;
varying float vFogDepth;

bool occupied(ivec2 c) {
  for (int i = 0; i < 64; i++) {
    if (float(i) >= occupiedCount) break;
    if (ivec2(floor(occupiedCells[i] + 0.5)) == c) return true;
  }
  return false;
}

void main() {
  // Cell centres sit on integer coordinates (see cellToWorld), borders on .5.
  vec2 cc = vWorldPosition.xz / cellSize;
  vec2 nearestCenter = floor(cc + 0.5);
  ivec2 ci = ivec2(nearestCenter);

  float line = 0.0;

  if (roundCells > 0.5) {
    // Offset from the cell centre (was: from the border, which centred the
    // circles on grid intersections).
    vec2 fromCenter = cc - nearestCenter;
    float d = abs(length(fromCenter) - 0.46);
    float edge = max(fwidth(d) * 1.5, 1e-4);
    line = 1.0 - smoothstep(0.0, edge, d);
  } else {
    vec2 local = abs(fract(cc) - 0.5);
    vec2 g = local / max(fwidth(cc), vec2(1e-4));
    line = 1.0 - min(min(g.x, g.y), 1.0);
  }

  // Only fragments that are actually on a line pay for the occupancy lookup.
  if (objectsOnly > 0.5 && line > 0.0 && !occupied(ci)) {
    line = 0.0;
  }

  vec3 base = fillColor;

  if (hasFirst > 0.5 && ci == ivec2(floor(firstCell + 0.5))) {
    base = firstColor;
  } else if (hasLast > 0.5 && ci == ivec2(floor(lastCell + 0.5))) {
    base = lastColor;
  }

  vec3 color = mix(base, gridColor, line * showGrid);
  float fog = smoothstep(fogNear, fogFar, vFogDepth);

  gl_FragColor = vec4(mix(color, fogColor, fog), 1.0);
}
`;

/** Uniform array size; objects-only mode outlines at most this many cells. */
export const MAX_OCCUPIED_CELLS = 64;

export function createSurfaceGridMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      fillColor: { value: new Color(surfaceVisual.fill) },
      gridColor: { value: new Color(surfaceVisual.grid) },
      fogColor: { value: new Color(surfaceVisual.fill) },
      firstColor: { value: new Color(surfaceVisual.firstCell) },
      lastColor: { value: new Color(surfaceVisual.lastCell) },
      firstCell: { value: new Vector2() },
      lastCell: { value: new Vector2() },
      hasFirst: { value: 0 },
      hasLast: { value: 0 },
      cellSize: { value: SURFACE_CELL_WORLD_SIZE },
      fogNear: { value: 1 },
      fogFar: { value: 100 },
      showGrid: { value: 1 },
      roundCells: { value: 0 },
      objectsOnly: { value: 0 },
      occupiedCells: {
        value: Array.from({ length: MAX_OCCUPIED_CELLS }, () => new Vector2()),
      },
      occupiedCount: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    toneMapped: false,
    depthWrite: true,
  });
}

export type SurfaceGridMaterial = ReturnType<typeof createSurfaceGridMaterial>;

export function applySurfaceThemeUniforms(m: SurfaceGridMaterial, b: string): void {
  const f = m.uniforms.fillColor?.value;
  const fog = m.uniforms.fogColor?.value;
  const g = m.uniforms.gridColor?.value;

  if (f instanceof Color) f.set(b);
  if (fog instanceof Color) fog.set(b);
  if (g instanceof Color) g.set(gridColorFor(b));
}

export function fogDistanceBounds(
  distance: number,
  nearFactor: number,
  farFactor: number,
): { near: number; far: number } {
  return {
    near: distance * nearFactor,
    far: distance * farFactor,
  };
}

export function applySurfaceFogUniforms(
  m: SurfaceGridMaterial,
  distance: number,
  nearFactor: number,
  farFactor: number,
): void {
  const b = fogDistanceBounds(distance, nearFactor, farFactor);
  const fogNear = m.uniforms.fogNear;
  const fogFar = m.uniforms.fogFar;

  if (fogNear === undefined || fogFar === undefined) {
    throw new Error('Surface grid fog uniforms are missing');
  }

  fogNear.value = b.near;
  fogFar.value = b.far;
}

export function applyEndpointCellUniforms(
  m: SurfaceGridMaterial,
  first: { readonly x: number; readonly y: number } | null,
  last: { readonly x: number; readonly y: number } | null,
): void {
  const hasFirst = m.uniforms.hasFirst;
  const hasLast = m.uniforms.hasLast;
  const firstCell = m.uniforms.firstCell;
  const lastCell = m.uniforms.lastCell;

  if (
    hasFirst === undefined ||
    hasLast === undefined ||
    firstCell === undefined ||
    lastCell === undefined
  ) {
    throw new Error('Surface grid endpoint uniforms are missing');
  }

  hasFirst.value = first === null ? 0 : 1;
  hasLast.value =
    last === null || (first !== null && first.x === last.x && first.y === last.y) ? 0 : 1;

  if (first !== null) {
    firstCell.value.set(first.x, first.y);
  }

  if (last !== null) {
    lastCell.value.set(last.x, last.y);
  }
}

export function applyGridSettings(
  m: SurfaceGridMaterial,
  visibility: 'on' | 'off',
  shape: 'square' | 'round',
  objectsOnly: boolean,
  cells: readonly { readonly x: number; readonly y: number }[],
): void {
  const showGrid = m.uniforms.showGrid;
  const roundCells = m.uniforms.roundCells;
  const objectsOnlyUniform = m.uniforms.objectsOnly;
  const occupiedCells = m.uniforms.occupiedCells;
  const occupiedCount = m.uniforms.occupiedCount;

  if (
    showGrid === undefined ||
    roundCells === undefined ||
    objectsOnlyUniform === undefined ||
    occupiedCells === undefined ||
    occupiedCount === undefined
  ) {
    throw new Error('Surface grid settings uniforms are missing');
  }

  showGrid.value = visibility === 'on' ? 1 : 0;
  roundCells.value = shape === 'round' ? 1 : 0;
  objectsOnlyUniform.value = objectsOnly ? 1 : 0;

  const target = occupiedCells.value as Vector2[];
  // Newest objects matter most when there are more than the uniform can hold.
  const start = Math.max(0, cells.length - target.length);
  const count = Math.min(target.length, cells.length);

  for (let i = 0; i < count; i++) {
    const cell = cells[start + i];
    target[i]?.set(cell?.x ?? 0, cell?.y ?? 0);
  }

  occupiedCount.value = count;
}
