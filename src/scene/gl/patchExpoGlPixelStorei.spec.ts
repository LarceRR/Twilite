import { describe, expect, it, vi } from 'vitest';

import { patchExpoGlPixelStorei } from './patchExpoGlPixelStorei';

describe('patchExpoGlPixelStorei', () => {
  it('forwards supported params and drops unsupported ones', () => {
    const pixelStorei = vi.fn();
    const gl = {
      UNPACK_FLIP_Y_WEBGL: 0x9240,
      UNPACK_ALIGNMENT: 0x0cf5,
      pixelStorei,
    };

    patchExpoGlPixelStorei(gl);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(0x9241, 1); // UNPACK_PREMULTIPLY_ALPHA_WEBGL

    expect(pixelStorei).toHaveBeenCalledTimes(2);
    expect(pixelStorei).toHaveBeenNthCalledWith(1, gl.UNPACK_FLIP_Y_WEBGL, 0);
    expect(pixelStorei).toHaveBeenNthCalledWith(2, gl.UNPACK_ALIGNMENT, 1);
  });
});
