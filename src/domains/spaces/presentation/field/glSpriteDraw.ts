import { Asset } from 'expo-asset';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { Image as RNImage } from 'react-native';

export type GlSheetTexture = {
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;
};

export function compileShader(
  gl: ExpoWebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
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

export function createSpriteProgram(gl: ExpoWebGLRenderingContext): WebGLProgram {
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

async function resolveAssetSize(
  asset: Asset,
  fallbackWidth: number,
  fallbackHeight: number,
): Promise<{ width: number; height: number }> {
  if (asset.width > 0 && asset.height > 0) {
    return { width: asset.width, height: asset.height };
  }
  const uri = asset.localUri ?? asset.uri;
  if (uri != null && uri.length > 0) {
    try {
      const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        RNImage.getSize(uri, (width, height) => resolve({ width, height }), reject);
      });
      if (dims.width > 0 && dims.height > 0) {
        asset.width = dims.width;
        asset.height = dims.height;
        return dims;
      }
    } catch {
      // fall through to manifest fallback
    }
  }
  return {
    width: Math.max(1, fallbackWidth),
    height: Math.max(1, fallbackHeight),
  };
}

/** Upload remote PNG via expo-asset with NEAREST filtering (crisp pixel art). */
export async function loadGlSheetTexture(
  gl: ExpoWebGLRenderingContext,
  url: string,
  fallbackWidth = 1,
  fallbackHeight = 1,
): Promise<GlSheetTexture> {
  const asset = Asset.fromURI(url);
  await asset.downloadAsync();
  const size = await resolveAssetSize(asset, fallbackWidth, fallbackHeight);

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

  return { texture, width: size.width, height: size.height };
}

export function drawSpriteQuad(
  gl: ExpoWebGLRenderingContext,
  program: WebGLProgram,
  sheet: GlSheetTexture,
  opts: {
    readonly posLoc: number;
    readonly uvLoc: number;
    /** Clip-space rect: left/right/bottom/top in [-1,1]. */
    readonly left: number;
    readonly right: number;
    readonly bottom: number;
    readonly top: number;
    readonly u0: number;
    readonly v0: number;
    readonly u1: number;
    readonly v1: number;
  },
): void {
  gl.useProgram(program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sheet.texture);

  const positions = new Float32Array([
    opts.left,
    opts.bottom,
    opts.right,
    opts.bottom,
    opts.left,
    opts.top,
    opts.right,
    opts.top,
  ]);
  const texCoords = new Float32Array([
    opts.u0,
    opts.v1,
    opts.u1,
    opts.v1,
    opts.u0,
    opts.v0,
    opts.u1,
    opts.v0,
  ]);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(opts.posLoc);
  gl.vertexAttribPointer(opts.posLoc, 2, gl.FLOAT, false, 0, 0);

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(opts.uvLoc);
  gl.vertexAttribPointer(opts.uvLoc, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.deleteBuffer(posBuf);
  gl.deleteBuffer(uvBuf);
}
