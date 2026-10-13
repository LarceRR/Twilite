export type SurfaceSpriteFrame = {
  readonly frame: number;
  readonly durationMs: number;
};

export type SpritePlaybackCursor = {
  readonly index: number;
  readonly elapsedMs: number;
};

export function easeOutCubic(progress: number): number {
  const bounded = Math.max(0, Math.min(1, progress));
  return 1 - (1 - bounded) ** 3;
}

export function advanceSpritePlayback(
  cursor: SpritePlaybackCursor,
  frames: readonly SurfaceSpriteFrame[],
  deltaMs: number,
): { readonly cursor: SpritePlaybackCursor; readonly frame: number | null } {
  if (frames.length === 0) return { cursor: { index: 0, elapsedMs: 0 }, frame: null };
  let index = cursor.index % frames.length;
  let elapsedMs = cursor.elapsedMs + Math.max(0, deltaMs);
  let current = frames[index];
  while (current !== undefined && elapsedMs >= current.durationMs && frames.length > 1) {
    elapsedMs -= current.durationMs;
    index = (index + 1) % frames.length;
    current = frames[index];
  }
  return {
    cursor: { index, elapsedMs },
    frame: current?.frame ?? null,
  };
}
