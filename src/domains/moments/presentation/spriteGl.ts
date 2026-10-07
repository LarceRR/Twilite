import { Asset } from 'expo-asset';
import type { ExpoWebGLRenderingContext } from 'expo-gl';

import type { FrameUv, GlRgb } from './spritePlayback';

const VERT = `
attribute vec2 aPosition;
attribute vec2 aCorner;
uniform vec4 uUv;
varying vec2 vUv;
void main() {
  vUv = mix(uUv.xy, uUv.zw, aCorner);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
void main() {
  gl_FragColor = texture2D(uTex, vUv);
}
`;

const POSITIONS = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
const CORNERS = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

export type SpriteRenderer = {
  readonly paint: (uv: FrameUv) => void;
  readonly dispose: () => void;
};

export async function createSpriteRenderer(
  gl: ExpoWebGLRenderingContext,
  fileUri: string,
  clear: () => GlRgb,
): Promise<SpriteRenderer> {
  const program = linkProgram(gl);
  const texture = await uploadNearest(gl, fileUri);
  const vao = bindQuad(gl, program);
  bindProgram(gl, program);
  gl.uniform1i(gl.getUniformLocation(program, 'uTex'), 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const uvLocation = gl.getUniformLocation(program, 'uUv');
  return {
    paint: (uv) => paintFrame(gl, program, vao, uvLocation, uv, clear()),
    dispose: () => release(gl, program, texture, vao),
  };
}

function linkProgram(gl: ExpoWebGLRenderingContext): WebGLProgram {
  const program = gl.createProgram();
  if (program === null) throw new Error('Не удалось создать программу');
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
    throw new Error('Не удалось связать программу');
  }
  return program;
}

function compile(gl: ExpoWebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error('Не удалось создать шейдер');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
    throw new Error('Не удалось скомпилировать шейдер');
  }
  return shader;
}

async function uploadNearest(
  gl: ExpoWebGLRenderingContext,
  fileUri: string,
): Promise<WebGLTexture> {
  const asset = Asset.fromURI(fileUri);
  await asset.downloadAsync();
  const texture = gl.createTexture();
  if (texture === null) throw new Error('Не удалось создать текстуру');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  uploadAsset(gl, asset);
  return texture;
}

function uploadAsset(gl: ExpoWebGLRenderingContext, asset: Asset): void {
  const upload = gl.texImage2D.bind(gl) as unknown as (
    target: number,
    level: number,
    internal: number,
    format: number,
    type: number,
    source: Asset,
  ) => void;
  upload(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset);
}

function bindQuad(gl: ExpoWebGLRenderingContext, program: WebGLProgram): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  if (vao === null) throw new Error('Не удалось создать буфер кадра');
  gl.bindVertexArray(vao);
  bindAttribute(gl, program, 'aPosition', POSITIONS);
  bindAttribute(gl, program, 'aCorner', CORNERS);
  return vao;
}

function bindAttribute(
  gl: ExpoWebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  data: Float32Array,
): void {
  const buffer = gl.createBuffer();
  const location = gl.getAttribLocation(program, name);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}

function bindProgram(gl: ExpoWebGLRenderingContext, program: WebGLProgram): void {
  const apply = gl.useProgram;
  apply.call(gl, program);
}

function paintFrame(
  gl: ExpoWebGLRenderingContext,
  program: WebGLProgram,
  vao: WebGLVertexArrayObject,
  uvLocation: WebGLUniformLocation | null,
  uv: FrameUv,
  clear: GlRgb,
): void {
  bindProgram(gl, program);
  gl.bindVertexArray(vao);
  gl.clearColor(clear.r, clear.g, clear.b, 1);
  gl.uniform4f(uvLocation, uv.u0, uv.v0, uv.u1, uv.v1);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.endFrameEXP();
}

function release(
  gl: ExpoWebGLRenderingContext,
  program: WebGLProgram,
  texture: WebGLTexture,
  vao: WebGLVertexArrayObject,
): void {
  gl.deleteProgram(program);
  gl.deleteTexture(texture);
  gl.deleteVertexArray(vao);
}
