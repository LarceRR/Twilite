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
    if (ivec2(occupiedCells[i]) == c) return true;
  }
  return false;
}

void main() {
  vec2 cc = vWorldPosition.xz / cellSize;
  vec2 local = abs(fract(cc) - 0.5);

  float line = 0.0;

  if (roundCells > 0.5) {
    float d = abs(length(local) - 0.46);
    line = 1.0 - smoothstep(0.0, fwidth(d) * 1.5, d);
  } else {
    vec2 g = local / fwidth(cc);
    line = 1.0 - min(min(g.x, g.y), 1.0);
  }

  ivec2 ci = ivec2(floor(cc + 0.5));

  if (objectsOnly < 0.5 || occupied(ci)) {
  } else {
    line = 0.0;
  }

  vec3 base = fillColor;

  if (hasFirst > 0.5 && ci == ivec2(firstCell)) {
    base = firstColor;
  } else if (hasLast > 0.5 && ci == ivec2(lastCell)) {
    base = lastColor;
  }

  vec3 color = mix(base, gridColor, line * showGrid);
  float fog = smoothstep(fogNear, fogFar, vFogDepth);

  gl_FragColor = vec4(mix(color, fogColor, fog), 1.0);
}
`;

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
        value: Array.from({ length: 64 }, () => new Vector2()),
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
  const count = Math.min(target.length, cells.length);

  for (let i = 0; i < count; i++) {
    target[i]?.set(cells[i]?.x ?? 0, cells[i]?.y ?? 0);
  }

  occupiedCount.value = count;
}
