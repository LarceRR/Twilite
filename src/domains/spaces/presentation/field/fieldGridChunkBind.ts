import {
  BufferGeometry,
  Float32BufferAttribute,
  type Mesh,
  type Texture,
} from 'three';

import {
  compositeThemeColorOver,
  fieldActiveCenterRgba,
  fieldLabelTextHex,
  themeColorToRgbaTuple,
} from './fieldGridActiveCells';
import { getFieldConfig } from './fieldConfigStore';
import { prepareFieldChunkTexture } from './fieldGridChunkBake';
import {
  createFieldGridChunkSpec,
  fieldChunkPlanePosition,
  fieldChunkToGridConfig,
} from './fieldGridChunks';
import type { FieldGridConfig } from './fieldGridConfig';
import { buildFieldGridLinePositions } from './fieldGridLineGeometry';
import {
  hexToRgba,
  type FieldGridLayerFlags,
} from './fieldGridLabelPixels';
import type { FieldGridWaveMaterial } from './fieldGridWaveMaterial';

export type FieldChunkBindInput = {
  readonly chunkIndex: number;
  readonly base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth' | 'showDividers'>;
  readonly layers: FieldGridLayerFlags;
  readonly surface: string;
  readonly surfaceRaised: string;
  readonly surfaceDivider: string;
};

export function resolveFieldChunkTexture(input: FieldChunkBindInput): Texture {
  return prepareFieldChunkTexture({
    chunkIndex: input.chunkIndex,
    base: input.base,
    colors: {
      fill: themeColorToRgbaTuple(input.surface),
      line: themeColorToRgbaTuple(compositeThemeColorOver(input.surfaceDivider, input.surface)),
      text: hexToRgba(fieldLabelTextHex()),
      activeFill: themeColorToRgbaTuple(input.surfaceRaised),
      activeCenter: fieldActiveCenterRgba(),
    },
    layers: input.layers,
  });
}

export function writeFieldChunkLineGeometry(
  chunkIndex: number,
  base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth' | 'showDividers'>,
  lineGeometry: BufferGeometry,
): void {
  const spec = createFieldGridChunkSpec(chunkIndex, base);
  const positions = buildFieldGridLinePositions(
    fieldChunkToGridConfig(spec),
    getFieldConfig().chunks.lineZLift,
    spec.colStart,
  );
  lineGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  lineGeometry.computeBoundingSphere();
}

export function placeFieldChunkMesh(
  chunkIndex: number,
  base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth'>,
  mesh: Mesh | null,
): void {
  if (mesh == null) return;
  const [x, y, z] = fieldChunkPlanePosition(createFieldGridChunkSpec(chunkIndex, base));
  mesh.position.set(x, y, z);
}

/** Rebind pooled texture + lines + mesh pose onto a recycled slot. */
export function bindFieldChunkSlot(
  input: FieldChunkBindInput,
  material: FieldGridWaveMaterial,
  lineGeometry: BufferGeometry,
  mesh: Mesh | null,
  surfaceMesh: Mesh | null = null,
): void {
  material.uniforms.uMap.value = resolveFieldChunkTexture(input);
  writeFieldChunkLineGeometry(input.chunkIndex, input.base, lineGeometry);
  placeFieldChunkMesh(input.chunkIndex, input.base, surfaceMesh);
  placeFieldChunkMesh(input.chunkIndex, input.base, mesh);
  if (mesh !== null) mesh.position.z += 0.2;
}
