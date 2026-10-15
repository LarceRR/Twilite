import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { InstancedMesh, MeshPhysicalMaterial, Object3D } from 'three';

import { useThemeColors } from '@/design-system/colors/colors';

import { createRoundedSquarePlatformGeometry } from './fieldPlatformGeometry';
import { type FieldGridConfig } from './fieldGridConfig';
import { cellCenterOnPlane } from './fieldGridCells';
import { fieldTileVariant } from './fieldTileGeneration';
import { useFieldTileStore } from './fieldTileStore';
import { useFieldConfig } from './useFieldConfig';

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
}: FieldGeneratedTilesProps): ReactElement {
  const fieldConfig = useFieldConfig();
  const settings = useFieldTileStore();
  const theme = useThemeColors();
  const meshRef = useRef<InstancedMesh>(null);
  // A 0–3 setting is a terrain level, not a 0–3 world-unit height.
  // Scaling it up makes the side walls visible at the field's 60-unit cell size.
  const geometryHeight = Math.max(1, settings.tileMaxHeight * 2);
  const tileGap = Math.max(2, (base.dividerWidth ?? 1) * 2);
  const tileSize = Math.max(1, base.cellSize - tileGap * 2);
  const geometry = useMemo(
    () =>
      createRoundedSquarePlatformGeometry(
        tileSize,
        geometryHeight,
        fieldConfig.platform.cornerRadius,
        fieldConfig.platform.edgeBevel,
      ),
    [
      tileSize,
      geometryHeight,
      fieldConfig.platform.cornerRadius,
      fieldConfig.platform.edgeBevel,
    ],
  );
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: '#FFFFFF',
        roughness: 0.7,
        metalness: 0.025,
        clearcoat: 0.14,
        clearcoatRoughness: 0.62,
        flatShading: false,
      }),
    [],
  );

  useLayoutEffect(() => {
    material.color.set(theme.surfaceRaised);
    material.emissive.set(theme.surfaceRaised);
    material.emissiveIntensity = 0.055;
  }, [material, theme.surfaceRaised]);

  useLayoutEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

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
      tileMinHeight: settings.tileMinHeight,
      tileMaxHeight: settings.tileMaxHeight,
    };
    let count = 0;

    for (let localCol = 0; localCol < columnCount; localCol += 1) {
      const col = chunkIndex * columnCount + localCol;
      for (let row = 0; row < base.rows; row += 1) {
        if (occupiedCellKeys.has(col + ':' + row)) continue;
        const variant = fieldTileVariant(settings.worldSeed, col, row, tileHeights);
        const renderHeight = variant.height === 0 ? 0.08 : variant.height * 2;
        const center = cellCenterOnPlane(col, row, gridConfig);

        // Keep tiles slightly above the continuous deck to avoid coplanar z-fighting.
        temp.position.set(center[0], center[1], renderHeight / 2 + 0.025);
        temp.rotation.set(0, 0, 0);
        temp.scale.set(1, 1, renderHeight / geometryHeight);
        temp.updateMatrix();
        mesh.setMatrixAt(count, temp.matrix);

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
    settings.generatedTilesEnabled,
    settings.worldSeed,
    settings.tileMinHeight,
    settings.tileMaxHeight,
    theme.surfaceRaised,
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
      frustumCulled={false}
      renderOrder={1}
    />
  );
}
