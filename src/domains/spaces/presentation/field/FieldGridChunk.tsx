import { type ThreeEvent } from '@react-three/fiber/native';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { BufferGeometry, PlaneGeometry, type Group, type Mesh } from 'three';

import { useSceneColors } from '@/design-system/colors/colors';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import { bindFieldChunkSlot } from './fieldGridChunkBind';
import { FIELD_CHUNK_COLS } from './fieldGridChunks';
import type { FieldGridConfig } from './fieldGridConfig';
import {
  createFieldGridWaveMaterial,
  type FieldGridWaveMaterial,
} from './fieldGridWaveMaterial';

type FieldGridChunkProps = {
  /** Null hides this recycled slot without tearing down GPU resources. */
  readonly chunkIndex: number | null;
  readonly base: Pick<FieldGridConfig, 'rows' | 'cellSize'>;
  readonly onMaterialReady: (chunkIndex: number, material: FieldGridWaveMaterial) => void;
  readonly onMaterialDispose: (chunkIndex: number, material: FieldGridWaveMaterial) => void;
  readonly onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  readonly onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  readonly onPointerUp: (event: ThreeEvent<PointerEvent>) => void;
  readonly onPointerCancel: () => void;
  readonly onPointerLeave: () => void;
};

function useChunkSlotResources(width: number, height: number) {
  const planeGeometry = useMemo(
    () => new PlaneGeometry(width, height, 1, 1),
    [width, height],
  );
  const lineGeometry = useMemo(() => new BufferGeometry(), []);
  const material = useMemo(() => createFieldGridWaveMaterial(null), []);

  useEffect(() => {
    return () => {
      material.dispose();
      planeGeometry.dispose();
      lineGeometry.dispose();
    };
  }, [material, planeGeometry, lineGeometry]);

  return { planeGeometry, lineGeometry, material };
}

/**
 * One recycled field-deck slot. Plane/material stay alive; only texture + lines
 * rebind when the streamed chunk index changes (avoids mount hitches).
 */
export function FieldGridChunk({
  chunkIndex,
  base,
  onMaterialReady,
  onMaterialDispose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
}: FieldGridChunkProps): ReactElement {
  const scene = useSceneColors();
  const showActiveCells = useSettingsStore((s) => s.developerShowActiveCells);
  const showActiveCenters = useSettingsStore((s) => s.developerShowActiveCellCenters);
  const showCellLabels = useSettingsStore((s) => s.developerShowCellLabels);

  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const boundChunkRef = useRef<number | null>(null);

  const width = FIELD_CHUNK_COLS * base.cellSize;
  const height = base.rows * base.cellSize;
  const { planeGeometry, lineGeometry, material } = useChunkSlotResources(width, height);

  useLayoutEffect(() => {
    const group = groupRef.current;
    const prevBound = boundChunkRef.current;

    if (chunkIndex == null) {
      if (prevBound != null) {
        onMaterialDispose(prevBound, material);
        boundChunkRef.current = null;
      }
      if (group != null) group.visible = false;
      return;
    }

    bindFieldChunkSlot(
      {
        chunkIndex,
        base,
        layers: { showActiveCells, showActiveCenters, showCellLabels },
        surfaceBase: scene.surfaceBase,
        surfaceDot: scene.surfaceDot,
      },
      material,
      lineGeometry,
      meshRef.current,
    );

    if (prevBound != null && prevBound !== chunkIndex) {
      onMaterialDispose(prevBound, material);
    }
    boundChunkRef.current = chunkIndex;
    onMaterialReady(chunkIndex, material);
    if (group != null) group.visible = true;
  }, [
    chunkIndex,
    base,
    showActiveCells,
    showActiveCenters,
    showCellLabels,
    scene.surfaceBase,
    scene.surfaceDot,
    material,
    lineGeometry,
    onMaterialReady,
    onMaterialDispose,
  ]);

  useEffect(() => {
    return () => {
      const bound = boundChunkRef.current;
      if (bound != null) onMaterialDispose(bound, material);
    };
  }, [material, onMaterialDispose]);

  return (
    <group ref={groupRef} visible={chunkIndex != null}>
      <mesh
        ref={meshRef}
        geometry={planeGeometry}
        material={material}
        receiveShadow
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
      />
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={scene.surfaceDot} toneMapped={false} />
      </lineSegments>
    </group>
  );
}
