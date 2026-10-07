import type { MomentSprite } from '../domain/entities/MomentCatalog';

export type ImageHeaders = Readonly<Record<string, string>> | null;

export type SpriteClockFrame = {
  readonly frame: number;
  readonly durationMs: number;
};

export type PixelFrameLayout = {
  readonly scale: number;
  readonly clipWidth: number;
  readonly clipHeight: number;
  readonly sheetWidth: number;
  readonly sheetHeight: number;
};

export function sheetFrameOrigin(
  frame: number,
  columns: number,
  frameWidth: number,
  frameHeight: number,
): { readonly x: number; readonly y: number } {
  const safeColumns = Math.max(1, columns);
  const column = ((frame % safeColumns) + safeColumns) % safeColumns;
  const row = Math.floor(frame / safeColumns);
  return { x: column * frameWidth, y: row * frameHeight };
}

export function nextLoopIndex(index: number, count: number): number {
  if (count <= 1) return 0;
  return (index + 1) % count;
}

export function frameDelayMs(durationMs: number): number {
  if (!Number.isFinite(durationMs)) return 100;
  return Math.min(10_000, Math.max(16, Math.round(durationMs)));
}

export function spriteLoops(sprite: MomentSprite | null): boolean {
  return sprite !== null && sprite.frames.length > 1;
}

/**
 * Integer device pixels per source pixel, same idea as a canvas blit with
 * smoothing off: one source pixel lands on a whole screen pixel.
 */
export function pixelFrameLayout(
  sprite: MomentSprite,
  boxWidth: number,
  boxHeight: number,
  pixelRatio: number,
): PixelFrameLayout | null {
  if (boxWidth <= 0 || boxHeight <= 0 || sprite.frameWidth <= 0 || sprite.frameHeight <= 0) {
    return null;
  }
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const fit = Math.min(boxWidth / sprite.frameWidth, boxHeight / sprite.frameHeight);
  const scale = Math.max(1, Math.floor(fit * ratio)) / ratio;
  return {
    scale,
    clipWidth: sprite.frameWidth * scale,
    clipHeight: sprite.frameHeight * scale,
    sheetWidth: sprite.columns * sprite.frameWidth * scale,
    sheetHeight: sprite.rows * sprite.frameHeight * scale,
  };
}

export type GlRgb = { readonly r: number; readonly g: number; readonly b: number };

/** Theme hex → GL clear color, so transparent pixels match the card. */
export function glClearColor(hex: string): GlRgb {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  const digits = match?.[1];
  if (digits === undefined) return { r: 0, g: 0, b: 0 };
  const value = Number.parseInt(digits, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

export type FrameUv = {
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
};

/** One cell of the sheet in GL space. v=1 is the top after an upload flip. */
export function frameUv(sprite: MomentSprite, frame: number): FrameUv {
  const origin = sheetFrameOrigin(frame, sprite.columns, sprite.frameWidth, sprite.frameHeight);
  const sheetWidth = sprite.columns * sprite.frameWidth;
  const sheetHeight = sprite.rows * sprite.frameHeight;
  const insetU = 0.5 / sheetWidth;
  const insetV = 0.5 / sheetHeight;
  return {
    u0: origin.x / sheetWidth + insetU,
    u1: (origin.x + sprite.frameWidth) / sheetWidth - insetU,
    v0: 1 - (origin.y + sprite.frameHeight) / sheetHeight + insetV,
    v1: 1 - origin.y / sheetHeight - insetV,
  };
}

/** Cache file name from the sheet URL only. The bearer token never lands in the path. */
export function sheetCacheLeaf(url: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${(hash >>> 0).toString(16)}.png`;
}

/**
 * Draw the current frame, then wait its duration. A still never schedules.
 * The painter is called outside React so a tick does not re-render the list.
 */
export function createSpriteClock<T>(input: {
  readonly frames: readonly SpriteClockFrame[];
  readonly paint: (frame: number) => void;
  readonly schedule: (delayMs: number, run: () => void) => T;
  readonly cancel: (id: T) => void;
}): () => void {
  let stopped = false;
  let index = 0;
  let timer: T | undefined;
  const step = (): void => {
    if (stopped) return;
    const entry = input.frames[index];
    if (entry === undefined) return;
    input.paint(entry.frame);
    if (input.frames.length < 2) return;
    timer = input.schedule(frameDelayMs(entry.durationMs), () => {
      index = nextLoopIndex(index, input.frames.length);
      step();
    });
  };
  step();
  return () => {
    stopped = true;
    if (timer !== undefined) input.cancel(timer);
  };
}

export function authorizedImageSource(
  uri: string,
  headers: ImageHeaders,
): { uri: string; headers: Record<string, string>; cache: 'force-cache' } | null {
  if (headers === null) return null;
  return { uri, headers: { ...headers }, cache: 'force-cache' };
}
