import { describe, expect, it, beforeEach } from 'vitest';
import { BufferGeometry, Mesh, PlaneGeometry } from 'three';

import { clearFieldChunkBakeCache } from './fieldGridChunkBake';
import {
  bindFieldChunkSlot,
  placeFieldChunkMesh,
  writeFieldChunkLineGeometry,
} from './fieldGridChunkBind';
import { createFieldGridWaveMaterial } from './fieldGridWaveMaterial';

describe('fieldGridChunkBind', () => {
  beforeEach(() => {
    clearFieldChunkBakeCache();
  });

  it('places a chunk mesh on absolute world X', () => {
    const mesh = new Mesh(new PlaneGeometry(1, 1));
    placeFieldChunkMesh(1, { rows: 15, cellSize: 60 }, mesh);
    expect(mesh.position.toArray()).toEqual([900, 0, 0]);
  });

  it('writes line geometry for the absolute chunk slice', () => {
    const geometry = new BufferGeometry();
    writeFieldChunkLineGeometry(1, { rows: 15, cellSize: 60 }, geometry);
    const attr = geometry.getAttribute('position');
    expect(attr).toBeTruthy();
    expect(attr!.count).toBeGreaterThan(0);
  });

  it('binds texture + pose onto a recycled material slot', () => {
    const material = createFieldGridWaveMaterial(null);
    const lines = new BufferGeometry();
    const mesh = new Mesh(new PlaneGeometry(600, 900));
    bindFieldChunkSlot(
      {
        chunkIndex: 0,
        base: { rows: 15, cellSize: 60 },
        layers: {
          showActiveCells: true,
          showActiveCenters: true,
          showCellLabels: true,
        },
        surfaceBase: '#101010',
        surfaceDot: '#ffffff',
      },
      material,
      lines,
      mesh,
    );
    expect(material.uniforms.uMap.value).toBeTruthy();
    expect(mesh.position.x).toBe(300);
    material.dispose();
    lines.dispose();
    mesh.geometry.dispose();
  });
});
