import { describe, expect, it, vi } from 'vitest';

import { createSpriteQuadBuffers, drawSpriteQuad } from './glSpriteQuad';

function fakeGl() {
  const createBuffer = vi.fn(() => ({}));
  const deleteBuffer = vi.fn();
  return {
    createBuffer,
    deleteBuffer,
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    drawArrays: vi.fn(),
    useProgram: vi.fn(),
    activeTexture: vi.fn(),
    bindTexture: vi.fn(),
    ARRAY_BUFFER: 1,
    FLOAT: 2,
    TRIANGLE_STRIP: 3,
    TEXTURE0: 4,
    TEXTURE_2D: 5,
  };
}

describe('drawSpriteQuad buffer reuse (P4-S5)', () => {
  it('does not create or delete buffers during paint', () => {
    const gl = fakeGl();
    const { posBuf, uvBuf } = createSpriteQuadBuffers(gl as never);
    expect(gl.createBuffer).toHaveBeenCalledTimes(2);

    drawSpriteQuad(
      gl as never,
      {} as WebGLProgram,
      { texture: {} as WebGLTexture, width: 16, height: 16 },
      {
        posLoc: 0,
        uvLoc: 1,
        posBuf: posBuf as WebGLBuffer,
        uvBuf: uvBuf as WebGLBuffer,
        left: -1,
        right: 1,
        bottom: -1,
        top: 1,
        u0: 0,
        v0: 0,
        u1: 1,
        v1: 1,
      },
    );

    expect(gl.createBuffer).toHaveBeenCalledTimes(2);
    expect(gl.deleteBuffer).not.toHaveBeenCalled();
    expect(gl.drawArrays).toHaveBeenCalled();
  });
});
