/** 6 vertices (two triangles) × (x, y, u, v). */
export const FLOATS_PER_SPRITE = 24;

/** Interleaved stride in bytes: 4 floats per vertex. */
export const SPRITE_VERTEX_STRIDE_BYTES = 16;

export type SpriteQuad = {
  /** Clip-space rect in [-1, 1]. */
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top: number;
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
};

function vertex(target: Float32Array, at: number, x: number, y: number, u: number, v: number): void {
  target[at] = x;
  target[at + 1] = y;
  target[at + 2] = u;
  target[at + 3] = v;
}

/**
 * Writes one sprite as two triangles into a shared interleaved buffer so the
 * whole layer uploads once per paint. Returns the next write offset.
 */
export function writeSpriteQuad(target: Float32Array, offset: number, quad: SpriteQuad): number {
  vertex(target, offset, quad.left, quad.bottom, quad.u0, quad.v1);
  vertex(target, offset + 4, quad.right, quad.bottom, quad.u1, quad.v1);
  vertex(target, offset + 8, quad.left, quad.top, quad.u0, quad.v0);
  vertex(target, offset + 12, quad.left, quad.top, quad.u0, quad.v0);
  vertex(target, offset + 16, quad.right, quad.bottom, quad.u1, quad.v1);
  vertex(target, offset + 20, quad.right, quad.top, quad.u1, quad.v0);
  return offset + FLOATS_PER_SPRITE;
}
