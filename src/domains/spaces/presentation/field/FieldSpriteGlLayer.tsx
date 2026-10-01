import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { memo, type ReactElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  fieldSpriteBoxPx,
  PIXEL_SHEET_MAX_DISPLAY_PX,
  pixelSheetFitSize,
} from '@/shared/pixelObject/pixelSheetDisplayLimits';
import { nextLoopIndex, sheetFrameOrigin } from '@/shared/pixelObject/sheetFrame';
import { selectShowHitbox, useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import type { ViewportSize } from './fieldCamera';
import { projectBridgeCell } from './fieldCamera';
import type { FieldSpritePlacement } from './FieldObjectLayer';
import { compareFieldSpritesBackToFront } from './fieldSpriteDepth';
import {
  createSpriteProgram,
  drawSpriteQuad,
  loadGlSheetTexture,
  type GlSheetTexture,
} from './glSpriteDraw';
import { shouldAnimateFieldSprite } from './shouldAnimateFieldSprite';

function spriteNeedsFrameLoop(sprite: FieldSpritePlacement): boolean {
  if (!shouldAnimateFieldSprite(sprite.cell.y)) {
    return false;
  }
  return (sprite.dto.animations[0]?.frames.length ?? 0) >= 2;
}

type FieldSpriteGlLayerProps = {
  readonly viewport: ViewportSize;
  readonly sprites: readonly FieldSpritePlacement[];
};

type AnimState = {
  index: number;
  deadline: number;
};

type GlRuntime = {
  readonly gl: ExpoWebGLRenderingContext;
  readonly program: WebGLProgram;
  readonly posLoc: number;
  readonly uvLoc: number;
  readonly sheets: Map<string, GlSheetTexture>;
};

type SpriteFrameBox = {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly zIndex: number;
};

type SheetHint = {
  readonly url: string;
  readonly fallbackWidth: number;
  readonly fallbackHeight: number;
};

function spriteFrameBoxes(
  sprites: readonly FieldSpritePlacement[],
  viewport: ViewportSize,
): readonly SpriteFrameBox[] {
  if (viewport.width < 1 || viewport.height < 1) {
    return [];
  }
  return sprites.map((sprite) => {
    const projected = projectBridgeCell(sprite.cell, viewport);
    const boxPx = fieldSpriteBoxPx(projected.cellPx, PIXEL_SHEET_MAX_DISPLAY_PX, sprite.cell.y);
    const fit = pixelSheetFitSize(
      boxPx,
      sprite.dto.sheet.frameWidth,
      sprite.dto.sheet.frameHeight,
    );
    return {
      id: sprite.surfaceObjectId,
      left: projected.left - fit.width / 2,
      top: projected.top - fit.height,
      width: fit.width,
      height: fit.height,
      zIndex: 20_000 - sprite.cell.y * 100 + sprite.cell.x,
    };
  });
}

/**
 * One shared expo-gl surface for all field sprites.
 * Stable GL context; textures load/reload when sheet URLs appear (app reopen safe).
 */
function FieldSpriteGlLayerComponent({
  viewport,
  sprites,
}: FieldSpriteGlLayerProps): ReactElement {
  const showFrames = useSettingsStore(selectShowHitbox);
  const runtimeRef = useRef<GlRuntime | null>(null);
  const animRef = useRef(new Map<string, AnimState>());
  const loadGenRef = useRef(0);
  const spritesRef = useRef(sprites);
  const viewportRef = useRef(viewport);
  spritesRef.current = sprites;
  viewportRef.current = viewport;

  const ordered = useMemo(
    () => [...sprites].sort(compareFieldSpritesBackToFront),
    [sprites],
  );
  const orderedRef = useRef(ordered);
  orderedRef.current = ordered;

  const frames = useMemo(() => spriteFrameBoxes(sprites, viewport), [sprites, viewport]);

  const sheetHints = useMemo(() => {
    const byUrl = new Map<string, SheetHint>();
    for (const sprite of sprites) {
      const url = sprite.dto.sheetUrl;
      if (byUrl.has(url)) {
        continue;
      }
      const cols = Math.max(1, sprite.dto.sheet.columns);
      const rows = Math.max(1, sprite.dto.sheet.rows);
      byUrl.set(url, {
        url,
        fallbackWidth: cols * Math.max(1, sprite.dto.sheet.frameWidth),
        fallbackHeight: rows * Math.max(1, sprite.dto.sheet.frameHeight),
      });
    }
    return [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
  }, [sprites]);

  const paint = useCallback(() => {
    const runtime = runtimeRef.current;
    const vp = viewportRef.current;
    if (runtime == null || vp.width < 1 || vp.height < 1) {
      return;
    }
    const { gl, program, posLoc, uvLoc, sheets } = runtime;
    // Context can be lost after backgrounding — skip until remount recreates it.
    if (gl.isContextLost?.() === true) {
      return;
    }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const now = performance.now();

    for (const sprite of orderedRef.current) {
      const sheet = sheets.get(sprite.dto.sheetUrl);
      if (sheet == null) {
        continue;
      }
      const clip = sprite.dto.animations[0]?.frames ?? [];
      const animate = spriteNeedsFrameLoop(sprite);
      let frameNumber = sprite.dto.staticPreviewFrame;
      if (animate) {
        let anim = animRef.current.get(sprite.surfaceObjectId);
        if (anim === undefined) {
          anim = { index: 0, deadline: now + (clip[0]?.durationMs ?? 100) };
          animRef.current.set(sprite.surfaceObjectId, anim);
        }
        while (now >= anim.deadline) {
          anim.index = nextLoopIndex(anim.index, clip.length);
          const duration = clip[anim.index]?.durationMs ?? 100;
          anim.deadline += duration;
          if (anim.deadline < now - duration) {
            anim.deadline = now + duration;
          }
        }
        frameNumber = clip[anim.index]?.frame ?? sprite.dto.staticPreviewFrame;
      } else {
        animRef.current.delete(sprite.surfaceObjectId);
      }
      const columns = Math.max(1, sprite.dto.sheet.columns);
      const { sx, sy } = sheetFrameOrigin(
        frameNumber,
        columns,
        sprite.dto.sheet.frameWidth,
        sprite.dto.sheet.frameHeight,
      );
      const fw = Math.max(1, sprite.dto.sheet.frameWidth);
      const fh = Math.max(1, sprite.dto.sheet.frameHeight);
      const u0 = sx / sheet.width;
      const v0 = sy / sheet.height;
      const u1 = (sx + fw) / sheet.width;
      const v1 = (sy + fh) / sheet.height;

      const projected = projectBridgeCell(sprite.cell, vp);
      const boxPx = fieldSpriteBoxPx(projected.cellPx, PIXEL_SHEET_MAX_DISPLAY_PX, sprite.cell.y);
      const fit = pixelSheetFitSize(boxPx, fw, fh);
      const leftPx = projected.left - fit.width / 2;
      const topPx = projected.top - fit.height;
      const rightPx = leftPx + fit.width;
      const bottomPx = topPx + fit.height;

      const left = (leftPx / vp.width) * 2 - 1;
      const right = (rightPx / vp.width) * 2 - 1;
      const top = 1 - (topPx / vp.height) * 2;
      const bottom = 1 - (bottomPx / vp.height) * 2;

      drawSpriteQuad(gl, program, sheet, {
        posLoc,
        uvLoc,
        left,
        right,
        bottom,
        top,
        u0,
        v0,
        u1,
        v1,
      });
    }

    gl.flush();
    gl.endFrameEXP();
  }, []);

  const sheetHintsRef = useRef(sheetHints);
  sheetHintsRef.current = sheetHints;

  const ensureSheets = useCallback(
    async (gl: ExpoWebGLRenderingContext, hints: readonly SheetHint[]) => {
      const runtime = runtimeRef.current;
      if (runtime == null || runtime.gl !== gl) {
        return;
      }
      const gen = ++loadGenRef.current;
      const needed = new Set(hints.map((hint) => hint.url));

      for (const [url, sheet] of [...runtime.sheets.entries()]) {
        if (!needed.has(url)) {
          gl.deleteTexture(sheet.texture);
          runtime.sheets.delete(url);
        }
      }

      for (const hint of hints) {
        if (runtime.sheets.has(hint.url)) {
          continue;
        }
        try {
          const sheet = await loadGlSheetTexture(
            gl,
            hint.url,
            hint.fallbackWidth,
            hint.fallbackHeight,
          );
          if (loadGenRef.current !== gen || runtimeRef.current?.gl !== gl) {
            gl.deleteTexture(sheet.texture);
            return;
          }
          runtime.sheets.set(hint.url, sheet);
        } catch {
          // Keep trying next paint cycle / next ensureSheets call.
        }
      }
      if (loadGenRef.current === gen && runtimeRef.current?.gl === gl) {
        paint();
      }
    },
    [paint],
  );

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      try {
        const program = createSpriteProgram(gl);
        const posLoc = gl.getAttribLocation(program, 'a_position');
        const uvLoc = gl.getAttribLocation(program, 'a_texCoord');
        const imageLoc = gl.getUniformLocation(program, 'u_image');
        gl.useProgram(program);
        if (imageLoc != null) {
          gl.uniform1i(imageLoc, 0);
        }

        runtimeRef.current = {
          gl,
          program,
          posLoc,
          uvLoc,
          sheets: new Map(),
        };
        void ensureSheets(gl, sheetHintsRef.current);
      } catch {
        runtimeRef.current = null;
      }
    },
    [ensureSheets],
  );

  // When sprites/sheets arrive after reopen — upload into the existing GL context.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (runtime == null) {
      return;
    }
    void ensureSheets(runtime.gl, sheetHints);
  }, [ensureSheets, sheetHints]);

  const needsAnimationLoop = useMemo(
    () => ordered.some(spriteNeedsFrameLoop),
    [ordered],
  );

  // Static scenes paint on sprite/viewport/sheet changes; RAF only while near rows animate.
  useEffect(() => {
    paint();
  }, [paint, ordered, viewport, sheetHints]);

  useEffect(() => {
    if (!needsAnimationLoop) {
      return;
    }
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      paint();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [needsAnimationLoop, paint]);

  useEffect(() => {
    return () => {
      loadGenRef.current += 1;
      const runtime = runtimeRef.current;
      if (runtime == null) {
        return;
      }
      for (const sheet of runtime.sheets.values()) {
        runtime.gl.deleteTexture(sheet.texture);
      }
      runtime.gl.deleteProgram(runtime.program);
      runtimeRef.current = null;
    };
  }, []);

  if (viewport.width < 1 || viewport.height < 1) {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <GLView
        style={StyleSheet.absoluteFill}
        msaaSamples={0}
        onContextCreate={onContextCreate}
      />
      {showFrames
        ? frames.map((box) => (
            <View
              key={box.id}
              style={[
                styles.debugFrame,
                {
                  left: box.left,
                  top: box.top,
                  width: box.width,
                  height: box.height,
                  zIndex: box.zIndex,
                },
              ]}
            >
              <Text style={styles.debugLabel}>
                {`${Math.round(box.width)}×${Math.round(box.height)}`}
              </Text>
            </View>
          ))
        : null}
    </View>
  );
}

export const FieldSpriteGlLayer = memo(FieldSpriteGlLayerComponent);

const styles = StyleSheet.create({
  debugFrame: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: 'transparent',
  },
  debugLabel: {
    position: 'absolute',
    top: -14,
    left: 0,
    fontSize: 10,
    lineHeight: 12,
    color: '#FF3B30',
    fontVariant: ['tabular-nums'],
  },
});
