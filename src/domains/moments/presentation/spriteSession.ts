import type { ExpoWebGLRenderingContext } from 'expo-gl';

import type { MomentFrame, MomentSprite } from '../domain/entities/MomentCatalog';
import { cachedSheetFile } from './sheetCache';
import { createSpriteRenderer, type SpriteRenderer } from './spriteGl';
import { createSpriteClock, frameUv, type GlRgb } from './spritePlayback';

export type SpriteSession = {
  readonly play: (frames: readonly MomentFrame[]) => void;
  readonly stop: () => void;
};

export async function openSpriteSession(input: {
  readonly gl: ExpoWebGLRenderingContext;
  readonly sprite: MomentSprite;
  readonly headers: Readonly<Record<string, string>>;
  readonly clear: () => GlRgb;
  readonly isCancelled: () => boolean;
}): Promise<SpriteSession> {
  const file = await cachedSheetFile(input.sprite.sheetUrl, input.headers);
  if (input.isCancelled()) return idleSession();
  const renderer = await createSpriteRenderer(input.gl, file, input.clear);
  if (input.isCancelled()) {
    renderer.dispose();
    return idleSession();
  }
  return liveSession(input.sprite, renderer);
}

function liveSession(sprite: MomentSprite, renderer: SpriteRenderer): SpriteSession {
  let stopClock: (() => void) | undefined;
  let disposed = false;
  return {
    play: (frames) => {
      if (disposed) return;
      stopClock?.();
      stopClock = startClock(sprite, renderer, frames);
    },
    stop: () => {
      if (disposed) return;
      disposed = true;
      stopClock?.();
      renderer.dispose();
    },
  };
}

function startClock(
  sprite: MomentSprite,
  renderer: SpriteRenderer,
  frames: readonly MomentFrame[],
): () => void {
  return createSpriteClock({
    frames,
    paint: (frame) => renderer.paint(frameUv(sprite, frame)),
    schedule: (delay, run) => setTimeout(run, delay),
    cancel: (id) => clearTimeout(id),
  });
}

function idleSession(): SpriteSession {
  return { play: () => undefined, stop: () => undefined };
}
