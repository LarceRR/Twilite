/**
 * Expo GL only implements a subset of WebGL pixelStorei params.
 * Three.js still calls the rest; native then logs a harmless warning.
 * Forward only supported params so texture uploads stay correct and quiet.
 */
export function patchExpoGlPixelStorei(
  gl: Pick<WebGLRenderingContext, 'pixelStorei' | 'UNPACK_FLIP_Y_WEBGL' | 'UNPACK_ALIGNMENT'>,
): void {
  const original = gl.pixelStorei.bind(gl);
  const supported = new Set<number>([gl.UNPACK_FLIP_Y_WEBGL, gl.UNPACK_ALIGNMENT]);

  gl.pixelStorei = ((pname: number, param: number) => {
    if (!supported.has(pname)) {
      return;
    }
    return original(pname, param);
  }) as typeof gl.pixelStorei;
}
