import { Asset } from 'expo-asset';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { type ReactElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PixelObjectDto, PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';
import { selectShowHitbox, useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import {
  PIXEL_SHEET_MAX_DISPLAY_PX,
  pixelSheetFitSize,
} from '@/shared/pixelObject/pixelSheetDisplayLimits';
import { nextLoopIndex, sheetFrameOrigin } from '@/shared/pixelObject/sheetFrame';

import {
  previewModelFromCatalogItem,
  previewModelFromMobile,
  type PixelSheetPreviewModel,
} from './pixelSheetPreviewModel';

type PixelSheetPreviewProps = {
  readonly item?: Pick<PixelObjectDto, 'sheetUrl' | 'manifest'>;
  readonly mobile?: PixelObjectMobileDto;
  readonly size?: number;
  readonly animate?: boolean;
};

type GlRuntime = {
  readonly gl: ExpoWebGLRenderingContext;
  readonly program: WebGLProgram;
  readonly texture: WebGLTexture;
  readonly posLoc: number;
  readonly uvLoc: number;
  readonly sheetW: number;
  readonly sheetH: number;
};

function resolveModel(props: PixelSheetPreviewProps): PixelSheetPreviewModel {
  if (props.mobile !== undefined) {
    return previewModelFromMobile(props.mobile);
  }
  if (props.item !== undefined) {
    return previewModelFromCatalogItem(props.item);
  }
  throw new Error('PixelSheetPreview requires item or mobile');
}

function compileShader(gl: ExpoWebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader == null) {
    throw new Error('Failed to create shader');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'shader compile failed';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: ExpoWebGLRenderingContext): WebGLProgram {
  const vertex = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `,
  );
  const fragment = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    void main() {
      gl_FragColor = texture2D(u_image, v_texCoord);
    }
  `,
  );
  const program = gl.createProgram();
  if (program == null) {
    throw new Error('Failed to create program');
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'program link failed';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function drawFrame(
  runtime: GlRuntime,
  sx: number,
  sy: number,
  frameWidth: number,
  frameHeight: number,
): void {
  const { gl, program, texture, posLoc, uvLoc, sheetW, sheetH } = runtime;
  const u0 = sx / sheetW;
  const v0 = sy / sheetH;
  const u1 = (sx + frameWidth) / sheetW;
  const v1 = (sy + frameHeight) / sheetH;

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const texCoords = new Float32Array([u0, v1, u1, v1, u0, v0, u1, v0]);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(uvLoc);
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.deleteBuffer(posBuf);
  gl.deleteBuffer(uvBuf);
  gl.flush();
  gl.endFrameEXP();
}

/** Catalog/field preview: expo-gl NEAREST (crisp pixels on iOS Retina). */
export function PixelSheetPreview(props: PixelSheetPreviewProps): ReactElement {
  const { size = PIXEL_SHEET_MAX_DISPLAY_PX, animate = true } = props;
  const showFrames = useSettingsStore(selectShowHitbox);
  const model = resolveModel(props);
  const { sheetUrl, frameWidth, frameHeight, columns, clip, staticPreviewFrame } = model;
  const fit = useMemo(
    () => pixelSheetFitSize(size, frameWidth, frameHeight),
    [frameHeight, frameWidth, size],
  );

  const runtimeRef = useRef<GlRuntime | null>(null);
  const indexRef = useRef(0);
  const deadlineRef = useRef(0);
  const clipRef = useRef(clip);
  clipRef.current = clip;
  const animateRef = useRef(animate);
  animateRef.current = animate;
  const dimsRef = useRef({ frameWidth, frameHeight, columns, staticPreviewFrame });
  dimsRef.current = { frameWidth, frameHeight, columns, staticPreviewFrame };

  const paintCurrent = useCallback(() => {
    const runtime = runtimeRef.current;
    if (runtime == null) {
      return;
    }
    const { columns: cols, frameWidth: fw, frameHeight: fh, staticPreviewFrame: preview } =
      dimsRef.current;
    const frames = clipRef.current;
    const frameNumber = frames[indexRef.current]?.frame ?? preview;
    const origin = sheetFrameOrigin(frameNumber, cols, fw, fh);
    drawFrame(runtime, origin.sx, origin.sy, fw, fh);
  }, []);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      try {
        const asset = Asset.fromURI(sheetUrl);
        await asset.downloadAsync();
        const program = createProgram(gl);
        const texture = gl.createTexture();
        if (texture == null) {
          throw new Error('Failed to create texture');
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset as unknown as TexImageSource);

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
          texture,
          posLoc,
          uvLoc,
          sheetW: Math.max(1, asset.width || columns * frameWidth),
          sheetH: Math.max(1, asset.height || model.rows * frameHeight),
        };
        indexRef.current = 0;
        deadlineRef.current = performance.now() + (clipRef.current[0]?.durationMs ?? 100);
        paintCurrent();
      } catch {
        runtimeRef.current = null;
      }
    },
    [columns, frameHeight, frameWidth, model.rows, paintCurrent, sheetUrl],
  );

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (runtimeRef.current == null) {
        return;
      }
      const frames = clipRef.current;
      if (!animateRef.current || frames.length < 2) {
        return;
      }
      let advanced = false;
      while (now >= deadlineRef.current) {
        indexRef.current = nextLoopIndex(indexRef.current, frames.length);
        const duration = frames[indexRef.current]?.durationMs ?? 100;
        deadlineRef.current += duration;
        advanced = true;
        if (deadlineRef.current < now - duration) {
          deadlineRef.current = now + duration;
        }
      }
      if (advanced) {
        paintCurrent();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paintCurrent, sheetUrl]);

  useEffect(() => {
    return () => {
      const runtime = runtimeRef.current;
      if (runtime == null) {
        return;
      }
      runtime.gl.deleteTexture(runtime.texture);
      runtime.gl.deleteProgram(runtime.program);
      runtimeRef.current = null;
    };
  }, [sheetUrl]);

  return (
    <View style={[styles.root, { width: fit.width, height: fit.height }]}>
      <GLView
        key={sheetUrl}
        style={StyleSheet.absoluteFill}
        msaaSamples={0}
        onContextCreate={onContextCreate}
      />
      {showFrames ? (
        <>
          <View pointerEvents="none" style={styles.debugFrame} />
          <Text style={styles.debugLabel}>{`${Math.round(fit.width)}×${Math.round(fit.height)}`}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    overflow: 'visible',
  },
  debugFrame: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: '#FF3B30',
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
