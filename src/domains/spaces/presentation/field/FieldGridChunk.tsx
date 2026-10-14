import { type ThreeEvent } from '@react-three/fiber/native';
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { BufferGeometry, DoubleSide, PlaneGeometry, type Group, type Mesh } from 'three';

import { useThemeColors } from '@/design-system/colors/colors';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import { compositeThemeColorOver } from './fieldGridActiveCells';
import { bindFieldChunkSlot } from './fieldGridChunkBind';
import {
  FIELD_GRID_OVERLAY_RENDER_ORDER,
  fieldGridWorldSize,
  type FieldGridConfig,
} from './fieldGridConfig';
import {
  createFieldGridWaveMaterial,
  type FieldGridWaveMaterial,
} from './fieldGridWaveMaterial';
import { useFieldConfig } from './useFieldConfig';

type FieldGridChunkProps = {
  /** Null hides this recycled slot without tearing down GPU resources. */
  readonly chunkIndex: number | null;
  readonly base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth' | 'showDividers'>;
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

/** The lit base receives shadows; its transparent overlay renders pixels and waves. */
function FieldGridChunkComponent({
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
  const { surface, surfaceRaised, surfaceDivider } = useThemeColors();
  const gridLineColor = compositeThemeColorOver(surfaceDivider, surface);
  const fieldConfig = useFieldConfig();
  const showActiveCells = useSettingsStore((s) => s.developerShowActiveCells);
  const showActiveCenters = useSettingsStore((s) => s.developerShowActiveCellCenters);
  const showCellLabels = useSettingsStore((s) => s.developerShowCellLabels);

  const groupRef = useRef<Group>(null);
  const surfaceMeshRef = useRef<Mesh>(null);
  const meshRef = useRef<Mesh>(null);
  const boundChunkRef = useRef<number | null>(null);

  const { width, height } = fieldGridWorldSize({
    cols: fieldConfig.chunks.cols,
    rows: base.rows,
    cellSize: base.cellSize,
    dividerWidth: base.dividerWidth,
  });
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
        surface,
        surfaceRaised,
        surfaceDivider,
      },
      material,
      lineGeometry,
      meshRef.current,
      surfaceMeshRef.current,
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
    surface,
    surfaceRaised,
    surfaceDivider,
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
      <mesh ref={surfaceMeshRef} geometry={planeGeometry} receiveShadow>
        <meshLambertMaterial color={surface} side={DoubleSide} />
      </mesh>
      <mesh
        ref={meshRef}
        geometry={planeGeometry}
        material={material}
        renderOrder={FIELD_GRID_OVERLAY_RENDER_ORDER}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
      />
      <lineSegments geometry={lineGeometry} visible={base.showDividers ?? true}>
        <lineBasicMaterial color={gridLineColor} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

export const FieldGridChunk = memo(FieldGridChunkComponent);
