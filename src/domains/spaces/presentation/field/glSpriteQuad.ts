import type { ExpoWebGLRenderingContext } from 'expo-gl';

export type GlSheetTexture = {
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;
};

export function drawSpriteQuad(
  gl: ExpoWebGLRenderingContext,
  program: WebGLProgram,
  sheet: GlSheetTexture,
  opts: {
    readonly posLoc: number;
    readonly uvLoc: number;
    /** Reused position buffer (created once per GL context). */
    readonly posBuf: WebGLBuffer;
    /** Reused UV buffer (created once per GL context). */
    readonly uvBuf: WebGLBuffer;
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

  gl.bindBuffer(gl.ARRAY_BUFFER, opts.posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(opts.posLoc);
  gl.vertexAttribPointer(opts.posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, opts.uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(opts.uvLoc);
  gl.vertexAttribPointer(opts.uvLoc, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/** Create reusable quad buffers once per GL context (P4-S5). */
export function createSpriteQuadBuffers(gl: ExpoWebGLRenderingContext): {
  readonly posBuf: WebGLBuffer;
  readonly uvBuf: WebGLBuffer;
} {
  const posBuf = gl.createBuffer();
  const uvBuf = gl.createBuffer();
  if (posBuf == null || uvBuf == null) {
    throw new Error('Failed to create sprite quad buffers');
  }
  return { posBuf, uvBuf };
}
