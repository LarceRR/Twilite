import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';

import { useThemeColors } from '@/design-system/colors/colors';

import { createRoundedSquarePlatformGeometry } from './fieldPlatformGeometry';
import { type FieldGridConfig } from './fieldGridConfig';
import { cellCenterOnPlane } from './fieldGridCells';
import { isActiveFieldGridCell } from './fieldGridActiveCells';
import { fieldTileVariant } from './fieldTileGeneration';
import { useFieldConfig } from './useFieldConfig';
import { useFieldMaterialStore } from './fieldMaterialStore';
import { useFieldSceneMaterial, createFieldStandardMaterial, ensureFieldGeometryUvChannels, updateFieldStandardMaterial } from './FieldSceneMaterialRuntime';

type FieldGeneratedTilesProps = {
  readonly chunkIndex: number | null;
  readonly base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth' | 'showDividers'>;
  readonly occupiedCellKeys: ReadonlySet<string>;
};

/** Seeded, streamed tile geometry. One InstancedMesh keeps each chunk to one draw call. */
export function FieldGeneratedTiles({
  chunkIndex,
  base,
  occupiedCellKeys,
}: FieldGeneratedTilesProps): ReactElement | null {
  const fieldConfig = useFieldConfig();
  const settings = useFieldMaterialStore();
  const { textures } = useFieldSceneMaterial();
  const theme = useThemeColors();
  const meshRef = useRef<InstancedMesh>(null);
  const geometryHeight = Math.max(1, settings.activeMaxHeight, settings.inactiveMaxHeight);
  const geometry = useMemo(
    () => ensureFieldGeometryUvChannels(
      createRoundedSquarePlatformGeometry(
        base.cellSize,
        geometryHeight,
        fieldConfig.platform.cornerRadius,
        fieldConfig.platform.edgeBevel,
      ),
    ),
    [base.cellSize, geometryHeight, fieldConfig.platform.cornerRadius, fieldConfig.platform.edgeBevel],
  );
  const material = useMemo(() => createFieldStandardMaterial('#FFFFFF'), []);

  useLayoutEffect(() => {
    updateFieldStandardMaterial(
      material,
      settings,
      textures,
      base.cellSize,
      theme.surfaceRaised,
    );
  }, [material, settings, textures, base.cellSize, theme.surfaceRaised]);

  useLayoutEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;
    if (chunkIndex === null || !settings.generatedTilesEnabled) {
      mesh.count = 0;
      mesh.instanceMatrix.needsUpdate = true;
      return;
    }

    const columnCount = fieldConfig.chunks.cols;
    const gridConfig: FieldGridConfig = {
      cols: columnCount,
      rows: base.rows,
      cellSize: base.cellSize,
      ...(base.dividerWidth === undefined ? {} : { dividerWidth: base.dividerWidth }),
      ...(base.showDividers === undefined ? {} : { showDividers: base.showDividers }),
    };
    const temp = new Object3D();
    const tileHeights = {
      inactiveMinHeight: settings.inactiveMinHeight,
      inactiveMaxHeight: settings.inactiveMaxHeight,
      activeMinHeight: settings.activeMinHeight,
      activeMaxHeight: settings.activeMaxHeight,
    };
    const inactiveColor = new Color('#FFFFFF');
    const activeAccent = new Color(theme.accent);
    const tileColor = new Color();
    let count = 0;

    for (let localCol = 0; localCol < columnCount; localCol += 1) {
      const col = chunkIndex * columnCount + localCol;
      for (let row = 0; row < base.rows; row += 1) {
        if (occupiedCellKeys.has(col + ':' + row)) continue;
        const active = isActiveFieldGridCell(row, base.rows, fieldConfig.activeCells.sideSpan);
        const variant = fieldTileVariant(settings.worldSeed, col, row, active, tileHeights);
        const renderHeight = variant.height === 0 ? 0.04 : variant.height;

        const center = cellCenterOnPlane(col, row, gridConfig);
        temp.position.set(center[0], center[1], renderHeight / 2);
        temp.rotation.set(0, 0, 0);
        temp.scale.set(1, 1, renderHeight / geometryHeight);
        temp.updateMatrix();
        mesh.setMatrixAt(count, temp.matrix);

        tileColor.copy(inactiveColor).multiplyScalar(variant.tint);
        if (active) tileColor.lerp(activeAccent, 0.12);
        mesh.setColorAt(count, tileColor);
        count += 1;
      }
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [
    chunkIndex,
    base.rows,
    base.cellSize,
    base.dividerWidth,
    base.showDividers,
    geometryHeight,
    occupiedCellKeys,
    fieldConfig.chunks.cols,
    fieldConfig.activeCells.sideSpan,
    settings.generatedTilesEnabled,
    settings.worldSeed,
    settings.inactiveMinHeight,
    settings.inactiveMaxHeight,
    settings.activeMinHeight,
    settings.activeMaxHeight,
    theme.accent,
  ]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh !== null) mesh.visible = chunkIndex !== null && settings.generatedTilesEnabled;
  }, [chunkIndex, settings.generatedTilesEnabled]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, fieldConfig.chunks.cols * base.rows]}
      castShadow
      receiveShadow
      frustumCulled
    />
  );
}
