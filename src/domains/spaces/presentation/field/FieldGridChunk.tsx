import { type ThreeEvent } from '@react-three/fiber/native';
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { BufferGeometry, Color, PlaneGeometry, type Group, type Mesh } from 'three';

import { useThemeColors } from '@/design-system/colors/colors';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import { compositeThemeColorOver } from './fieldGridActiveCells';
import { FieldGeneratedTiles } from './FieldGeneratedTiles';
import {
  createFieldStandardMaterial,
  ensureFieldGeometryUvChannels,
  updateFieldStandardMaterial,
  useFieldSceneMaterial,
} from './FieldSceneMaterialRuntime';
import { useFieldMaterialStore } from './fieldMaterialStore';
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
  readonly occupiedCellKeys: ReadonlySet<string>;
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
    () => ensureFieldGeometryUvChannels(new PlaneGeometry(width, height, 1, 1)),
    [width, height],
  );
  // Dedicated tessellated floor geometry lets displacement maps affect the surface visibly.
  const surfaceGeometry = useMemo(
    () => ensureFieldGeometryUvChannels(new PlaneGeometry(width, height, 64, 64)),
    [width, height],
  );
  const lineGeometry = useMemo(() => new BufferGeometry(), []);
  const material = useMemo(() => createFieldGridWaveMaterial(null), []);

  useEffect(() => {
    return () => {
      material.dispose();
      planeGeometry.dispose();
      surfaceGeometry.dispose();
      lineGeometry.dispose();
    };
  }, [material, planeGeometry, surfaceGeometry, lineGeometry]);

  return { planeGeometry, surfaceGeometry, lineGeometry, material };
}

/** The lit base receives shadows; its transparent overlay renders pixels and waves. */
function FieldGridChunkComponent({
  chunkIndex,
  base,
  occupiedCellKeys,
  onMaterialReady,
  onMaterialDispose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
}: FieldGridChunkProps): ReactElement {
  const { surface, surfaceDivider } = useThemeColors();
  const materialSettings = useFieldMaterialStore();
  const { textures } = useFieldSceneMaterial();
  const gridLineColor = compositeThemeColorOver(surfaceDivider, surface);
  const fieldConfig = useFieldConfig();
  const surfaceMaterialColor = useMemo(
    () =>
      new Color(surface).lerp(
        new Color(fieldConfig.lighting.surfaceAmbientColor),
        fieldConfig.lighting.surfaceAmbientIntensity,
      ),
    [
      surface,
      fieldConfig.lighting.surfaceAmbientColor,
      fieldConfig.lighting.surfaceAmbientIntensity,
    ],
  );
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
    ...(base.dividerWidth === undefined ? {} : { dividerWidth: base.dividerWidth }),
  });
  const { planeGeometry, surfaceGeometry, lineGeometry, material } = useChunkSlotResources(width, height);
  const surfacePbrMaterial = useMemo(() => createFieldStandardMaterial('#FFFFFF'), []);

  useLayoutEffect(() => {
    updateFieldStandardMaterial(
      surfacePbrMaterial,
      materialSettings,
      textures,
      base.cellSize,
      surfaceMaterialColor.getStyle(),
    );
  }, [surfacePbrMaterial, materialSettings, textures, base.cellSize, surfaceMaterialColor]);

  useEffect(() => () => surfacePbrMaterial.dispose(), [surfacePbrMaterial]);

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
        activeFill: fieldConfig.activeCells.fillHex,
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
    fieldConfig.activeCells.fillHex,
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
      <mesh
        ref={surfaceMeshRef}
        geometry={surfaceGeometry}
        material={surfacePbrMaterial}
        receiveShadow
      />
      <FieldGeneratedTiles
        chunkIndex={chunkIndex}
        base={base}
        occupiedCellKeys={occupiedCellKeys}
      />
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
