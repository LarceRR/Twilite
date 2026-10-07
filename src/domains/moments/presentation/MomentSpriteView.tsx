import { type ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { memo, type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Image, PixelRatio, StyleSheet } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';

import type { MomentFrame, MomentSprite } from '../domain/entities/MomentCatalog';
import { momentCatalogLayout as layout } from './momentCatalogLayout';
import {
  authorizedImageSource,
  glClearColor,
  type ImageHeaders,
  type PixelFrameLayout,
  pixelFrameLayout,
} from './spritePlayback';
import { openSpriteSession, type SpriteSession } from './spriteSession';

export type MomentSpriteViewProps = {
  readonly sprite: MomentSprite;
  readonly headers: ImageHeaders;
  readonly playing: boolean;
  readonly width: number;
};

function MomentSpriteViewComponent({
  sprite,
  headers,
  playing,
  width,
}: MomentSpriteViewProps): ReactElement | null {
  const frameLayout = useMemo(
    () => pixelFrameLayout(sprite, width, layout.tileArtHeight, PixelRatio.get()),
    [sprite, width],
  );
  const frames = useMemo(() => clipFrames(sprite, playing), [sprite, playing]);
  if (frameLayout === null || headers === null) return null;

  return <SpriteGl frames={frames} headers={headers} layout={frameLayout} sprite={sprite} />;
}

export const MomentSpriteView = memo(MomentSpriteViewComponent);

function SpriteGl({
  sprite,
  frames,
  headers,
  layout: frameLayout,
}: {
  readonly sprite: MomentSprite;
  readonly frames: readonly MomentFrame[];
  readonly headers: Readonly<Record<string, string>>;
  readonly layout: PixelFrameLayout;
}): ReactElement {
  const theme = useThemeColors();
  const session = useRef<SpriteSession | null>(null);
  const framesRef = useRef(frames);
  const tokenRef = useRef(0);
  const clearRef = useRef(glClearColor(theme.surfaceSunken));
  clearRef.current = glClearColor(theme.surfaceSunken);
  framesRef.current = frames;
  useSpriteLifetime(sprite.sheetUrl, session, tokenRef);
  useEffect(() => {
    session.current?.play(frames);
  }, [frames]);

  return (
    <GLView
      key={sprite.sheetUrl}
      msaaSamples={0}
      onContextCreate={(gl) => {
        mountSprite(gl, sprite, headers, tokenRef, session, framesRef, clearRef);
      }}
      collapsable={false}
      pointerEvents="none"
      style={{
        width: frameLayout.clipWidth,
        height: frameLayout.clipHeight,
        backgroundColor: 'transparent',
      }}
    />
  );
}

function useSpriteLifetime(
  sheetUrl: string,
  session: { current: SpriteSession | null },
  tokenRef: { current: number },
): void {
  useEffect(() => {
    const token = tokenRef.current;
    return () => {
      releaseSprite(session, tokenRef, token, sheetUrl);
    };
  }, [sheetUrl, session, tokenRef]);
}

function releaseSprite(
  session: { current: SpriteSession | null },
  tokenRef: { current: number },
  token: number,
  sheetUrl: string,
): void {
  if (sheetUrl.length === 0) return;
  if (tokenRef.current === token) tokenRef.current += 1;
  session.current?.stop();
  session.current = null;
}

function mountSprite(
  gl: ExpoWebGLRenderingContext,
  sprite: MomentSprite,
  headers: Readonly<Record<string, string>>,
  tokenRef: { current: number },
  session: { current: SpriteSession | null },
  framesRef: { current: readonly MomentFrame[] },
  clearRef: { current: ReturnType<typeof glClearColor> },
): void {
  const token = tokenRef.current;
  void openSpriteSession({
    gl,
    sprite,
    headers,
    clear: () => clearRef.current,
    isCancelled: () => tokenRef.current !== token,
  })
    .then((opened) => {
      if (tokenRef.current !== token) {
        opened.stop();
        return;
      }
      session.current?.stop();
      session.current = opened;
      opened.play(framesRef.current);
    })
    .catch(() => undefined);
}

function clipFrames(sprite: MomentSprite, playing: boolean): readonly MomentFrame[] {
  if (playing && sprite.frames.length > 1) return sprite.frames;
  return [{ frame: sprite.staticPreviewFrame, durationMs: 0 }];
}

export function CoverImage({
  uri,
  headers,
}: {
  readonly uri: string;
  readonly headers: ImageHeaders;
}): ReactElement | null {
  const source = useMemo(() => authorizedImageSource(uri, headers), [uri, headers]);
  if (source === null) return null;
  return (
    <Image
      accessible={false}
      fadeDuration={0}
      resizeMode="contain"
      source={source}
      style={styles.cover}
    />
  );
}

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
  },
});
