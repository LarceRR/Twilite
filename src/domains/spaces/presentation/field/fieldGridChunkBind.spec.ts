import { describe, expect, it, beforeEach } from 'vitest';
import { BufferGeometry, Mesh, PlaneGeometry } from 'three';

import { clearFieldChunkBakeCache } from './fieldGridChunkBake';
import {
  bindFieldChunkSlot,
  placeFieldChunkMesh,
  writeFieldChunkLineGeometry,
} from './fieldGridChunkBind';
import { createFieldGridWaveMaterial } from './fieldGridWaveMaterial';
import { FIELD_LOCAL_LIGHT_LAYER } from './fieldGridConfig';

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
    const surfaceMesh = new Mesh(new PlaneGeometry(600, 900));
    bindFieldChunkSlot(
      {
        chunkIndex: 0,
        base: { rows: 15, cellSize: 60 },
        layers: {
          showActiveCells: true,
          showActiveCenters: true,
          showCellLabels: true,
        },
        surface: '#101010',
        activeFill: '#303030',
        surfaceDivider: 'rgba(0, 0, 0, 0.1)',
      },
      material,
      lines,
      mesh,
      surfaceMesh,
    );
    expect(material.uniforms.uMap.value).toBeTruthy();
    expect(mesh.position.x).toBe(300);
    expect(mesh.position.z).toBeCloseTo(0.2);
    expect(surfaceMesh.position.toArray()).toEqual([300, 0, 0]);
    expect(surfaceMesh.layers.isEnabled(FIELD_LOCAL_LIGHT_LAYER)).toBe(true);
    material.dispose();
    lines.dispose();
    mesh.geometry.dispose();
    surfaceMesh.geometry.dispose();
  });
});
