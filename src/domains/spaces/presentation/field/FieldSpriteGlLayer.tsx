import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { memo, type ReactElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  selectShowHitbox,
  useSettingsStore,
} from '@/domains/settings/presentation/stores/settingsStore';
import {
  fieldSpriteBoxPx,
  PIXEL_SHEET_MAX_DISPLAY_PX,
  pixelSheetFitSize,
} from '@/shared/pixelObject/pixelSheetDisplayLimits';
import { nextLoopIndex, sheetFrameOrigin } from '@/shared/pixelObject/sheetFrame';

import type { ViewportSize } from './fieldCamera';
import { projectBridgeCell } from './fieldCamera';
import type { FieldSpritePlacement } from './FieldObjectLayer';
import { compareFieldSpritesBackToFront, fieldSpriteZIndex } from './fieldSpriteDepth';
import { createSpriteProgram, type GlSheetTexture, loadGlSheetTexture } from './glSpriteDraw';
import { shouldAnimateFieldSprite } from './shouldAnimateFieldSprite';
import { FLOATS_PER_SPRITE, SPRITE_VERTEX_STRIDE_BYTES, writeSpriteQuad } from './spriteBatch';

/** A 0ms (or missing) frame duration used to spin the catch-up loop forever. */
const MIN_FRAME_MS = 16;
const DEFAULT_FRAME_MS = 100;
const SHEET_RETRY_LIMIT = 3;
const SHEET_RETRY_BASE_MS = 1000;

function frameDuration(ms: number | undefined): number {
  return Math.max(MIN_FRAME_MS, ms ?? DEFAULT_FRAME_MS);
}

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
  readonly buffer: WebGLBuffer;
  readonly sheets: Map<string, GlSheetTexture>;
  /** Reused vertex scratch; reallocated only when the drawable count changes. */
  vertices: Float32Array;
};

type SpriteFrameBox = {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly zIndex: number;
};

/** Everything about a sprite that only changes with sprites/viewport, not per frame. */
type SpriteLayout = {
  readonly sprite: FieldSpritePlacement;
  readonly animate: boolean;
  readonly columns: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly box: SpriteFrameBox;
};

type SheetHint = {
  readonly url: string;
  readonly fallbackWidth: number;
  readonly fallbackHeight: number;
};

type TextureRun = {
  texture: WebGLTexture;
  first: number;
  count: number;
};

function buildLayout(
  ordered: readonly FieldSpritePlacement[],
  viewport: ViewportSize,
): readonly SpriteLayout[] {
  if (viewport.width < 1 || viewport.height < 1) {
    return [];
  }
  return ordered.map((sprite) => {
    const frameWidth = Math.max(1, sprite.dto.sheet.frameWidth);
    const frameHeight = Math.max(1, sprite.dto.sheet.frameHeight);
    const projected = projectBridgeCell(sprite.cell, viewport);
    const boxPx = fieldSpriteBoxPx(projected.cellPx, PIXEL_SHEET_MAX_DISPLAY_PX, sprite.cell.y);
    const fit = pixelSheetFitSize(boxPx, frameWidth, frameHeight);
    const leftPx = projected.left - fit.width / 2;
    const topPx = projected.top - fit.height;

    return {
      sprite,
      animate: spriteNeedsFrameLoop(sprite),
      columns: Math.max(1, sprite.dto.sheet.columns),
      frameWidth,
      frameHeight,
      left: (leftPx / viewport.width) * 2 - 1,
      right: ((leftPx + fit.width) / viewport.width) * 2 - 1,
      top: 1 - (topPx / viewport.height) * 2,
      bottom: 1 - ((topPx + fit.height) / viewport.height) * 2,
      box: {
        id: sprite.surfaceObjectId,
        left: leftPx,
        top: topPx,
        width: fit.width,
        height: fit.height,
        zIndex: fieldSpriteZIndex(sprite.cell),
      },
    };
  });
}

function resolveFrame(item: SpriteLayout, now: number, anims: Map<string, AnimState>): number {
  const { dto, surfaceObjectId: id } = item.sprite;
  if (!item.animate) {
    anims.delete(id);
    return dto.staticPreviewFrame;
  }

  const clip = dto.animations[0]?.frames ?? [];
  let anim = anims.get(id);
  if (anim === undefined) {
    anim = { index: 0, deadline: now + frameDuration(clip[0]?.durationMs) };
    anims.set(id, anim);
  }

  // Bounded catch-up: at most one loop, then resync to now (e.g. after background).
  let steps = 0;
  while (now >= anim.deadline && steps < clip.length) {
    anim.index = nextLoopIndex(anim.index, clip.length);
    anim.deadline += frameDuration(clip[anim.index]?.durationMs);
    steps += 1;
  }
  if (now >= anim.deadline) {
    anim.deadline = now + frameDuration(clip[anim.index]?.durationMs);
  }

  return clip[anim.index]?.frame ?? dto.staticPreviewFrame;
}

/**
 * One shared expo-gl surface for all field sprites.
 *
 * Per paint: one buffer upload, one draw per run of sprites sharing a sheet
 * (back-to-front order preserved). Projection happens when sprites/viewport
 * change, not every frame. Previously each sprite created and deleted two GL
 * buffers and re-projected through a freshly updated camera on every frame.
 */
function FieldSpriteGlLayerComponent({
  viewport,
  sprites,
}: FieldSpriteGlLayerProps): ReactElement {
  const showFrames = useSettingsStore(selectShowHitbox);
  const runtimeRef = useRef<GlRuntime | null>(null);
  const animRef = useRef(new Map<string, AnimState>());
  const loadGenRef = useRef(0);
  const retryCountRef = useRef(new Map<string, number>());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const ordered = useMemo(() => [...sprites].sort(compareFieldSpritesBackToFront), [sprites]);
  const layout = useMemo(() => buildLayout(ordered, viewport), [ordered, viewport]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

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
  const sheetHintsRef = useRef(sheetHints);
  sheetHintsRef.current = sheetHints;

  const paint = useCallback(() => {
    const runtime = runtimeRef.current;
    const vp = viewportRef.current;
    if (runtime == null || vp.width < 1 || vp.height < 1) {
      return;
    }
    const { gl, program, posLoc, uvLoc, sheets, buffer } = runtime;
    // Context can be lost after backgrounding — skip until remount recreates it.
    if (gl.isContextLost?.() === true) {
      return;
    }

    const items = layoutRef.current;
    const drawable: { item: SpriteLayout; sheet: GlSheetTexture }[] = [];
    for (const item of items) {
      const sheet = sheets.get(item.sprite.dto.sheetUrl);
      if (sheet !== undefined) {
        drawable.push({ item, sheet });
      }
    }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (drawable.length > 0) {
      const needed = drawable.length * FLOATS_PER_SPRITE;
      if (runtime.vertices.length !== needed) {
        runtime.vertices = new Float32Array(needed);
      }

      const now = performance.now();
      const runs: TextureRun[] = [];
      let offset = 0;

      for (let index = 0; index < drawable.length; index += 1) {
        const entry = drawable[index];
        if (entry === undefined) {
          continue;
        }
        const { item, sheet } = entry;
        const frameNumber = resolveFrame(item, now, animRef.current);
        const { sx, sy } = sheetFrameOrigin(
          frameNumber,
          item.columns,
          item.frameWidth,
          item.frameHeight,
        );
        offset = writeSpriteQuad(runtime.vertices, offset, {
          left: item.left,
          right: item.right,
          bottom: item.bottom,
          top: item.top,
          u0: sx / sheet.width,
          v0: sy / sheet.height,
          u1: (sx + item.frameWidth) / sheet.width,
          v1: (sy + item.frameHeight) / sheet.height,
        });

        const last = runs[runs.length - 1];
        if (last !== undefined && last.texture === sheet.texture) {
          last.count += 6;
        } else {
          runs.push({ texture: sheet.texture, first: index * 6, count: 6 });
        }
      }

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, runtime.vertices, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, SPRITE_VERTEX_STRIDE_BYTES, 0);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, SPRITE_VERTEX_STRIDE_BYTES, 8);
      gl.activeTexture(gl.TEXTURE0);

      for (const run of runs) {
        gl.bindTexture(gl.TEXTURE_2D, run.texture);
        gl.drawArrays(gl.TRIANGLES, run.first, run.count);
      }
    }

    gl.flush();
    gl.endFrameEXP();
  }, []);

  const ensureSheetsRef = useRef<
    ((gl: ExpoWebGLRenderingContext, hints: readonly SheetHint[]) => Promise<void>) | null
  >(null);

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
      for (const url of [...retryCountRef.current.keys()]) {
        if (!needed.has(url)) {
          retryCountRef.current.delete(url);
        }
      }

      let retryAttempt = 0;

      for (const hint of hints) {
        if (runtime.sheets.has(hint.url)) {
          continue;
        }
        const attempts = retryCountRef.current.get(hint.url) ?? 0;
        if (attempts > SHEET_RETRY_LIMIT) {
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
          retryCountRef.current.delete(hint.url);
        } catch {
          const next = attempts + 1;
          retryCountRef.current.set(hint.url, next);
          retryAttempt = Math.max(retryAttempt, next);
        }
      }

      if (loadGenRef.current !== gen || runtimeRef.current?.gl !== gl) {
        return;
      }

      paint();

      // The old catch said "keep trying next paint cycle" but nothing ever did.
      if (
        retryAttempt > 0 &&
        retryAttempt <= SHEET_RETRY_LIMIT &&
        retryTimerRef.current === null
      ) {
        retryTimerRef.current = setTimeout(
          () => {
            retryTimerRef.current = null;
            const current = runtimeRef.current;
            if (current !== null) {
              void ensureSheetsRef.current?.(current.gl, sheetHintsRef.current);
            }
          },
          SHEET_RETRY_BASE_MS * 2 ** (retryAttempt - 1),
        );
      }
    },
    [paint],
  );
  ensureSheetsRef.current = ensureSheets;

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      try {
        const program = createSpriteProgram(gl);
        const posLoc = gl.getAttribLocation(program, 'a_position');
        const uvLoc = gl.getAttribLocation(program, 'a_texCoord');
        const imageLoc = gl.getUniformLocation(program, 'u_image');
        const buffer = gl.createBuffer();
        if (buffer == null) {
          throw new Error('Failed to create sprite buffer');
        }
        gl.useProgram(program);
        if (imageLoc != null) {
          gl.uniform1i(imageLoc, 0);
        }

        runtimeRef.current = {
          gl,
          program,
          posLoc,
          uvLoc,
          buffer,
          sheets: new Map(),
          vertices: new Float32Array(0),
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

  // Forget animation clocks of sprites that left the field.
  useEffect(() => {
    const alive = new Set(ordered.map((sprite) => sprite.surfaceObjectId));
    for (const id of [...animRef.current.keys()]) {
      if (!alive.has(id)) {
        animRef.current.delete(id);
      }
    }
  }, [ordered]);

  const needsAnimationLoop = useMemo(() => layout.some((item) => item.animate), [layout]);

  // Static scenes paint on layout/sheet changes; RAF only while near rows animate.
  useEffect(() => {
    paint();
  }, [paint, layout, sheetHints]);

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
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      const runtime = runtimeRef.current;
      if (runtime == null) {
        return;
      }
      for (const sheet of runtime.sheets.values()) {
        runtime.gl.deleteTexture(sheet.texture);
      }
      runtime.gl.deleteBuffer(runtime.buffer);
      runtime.gl.deleteProgram(runtime.program);
      runtimeRef.current = null;
    };
  }, []);

  if (viewport.width < 1 || viewport.height < 1) {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <GLView style={StyleSheet.absoluteFill} msaaSamples={0} onContextCreate={onContextCreate} />
      {showFrames
        ? layout.map(({ box }) => (
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
