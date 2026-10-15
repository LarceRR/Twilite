import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { InstancedMesh, Object3D, type Texture } from 'three';

import { useThemeColors } from '@/design-system/colors/colors';

import { createRoundedSquarePlatformGeometry } from './fieldPlatformGeometry';
import { type FieldGridConfig } from './fieldGridConfig';
import { cellCenterOnPlane } from './fieldGridCells';
import {
  createFieldGridWaveMaterial,
  registerFieldGridWaveMaterial,
} from './fieldGridWaveMaterial';
import { fieldTileVariant, objectPlatformHeight } from './fieldTileGeneration';
import { useFieldTileStore } from './fieldTileStore';
import {
  acquireFieldTileTexture,
  createSolidTileTexture,
  hydrateFieldTileTextureUri,
} from './fieldTileTexture';
import { useFieldConfig } from './useFieldConfig';

type FieldGeneratedTilesProps = {
  readonly chunkIndex: number | null;
  readonly base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth' | 'showDividers'>;
  readonly occupiedCellKeys: ReadonlySet<string>;
};

/**
 * Every cell, occupied or not, is an instance of exactly the same tile geometry,
 * with one configured thickness and one shared shader material per streamed chunk.
 * Elevation only changes each instance's Z position; its Z scale is always 1.
 */
export function FieldGeneratedTiles({
  chunkIndex,
  base,
  occupiedCellKeys,
}: FieldGeneratedTilesProps): ReactElement {
  const fieldConfig = useFieldConfig();
  const settings = useFieldTileStore();
  const theme = useThemeColors();
  const meshRef = useRef<InstancedMesh>(null);
  const [customTexture, setCustomTexture] = useState<Texture | null>(null);

  const thickness = Math.max(0.1, fieldConfig.platform.height);
  const tileSize = base.cellSize;
  const geometry = useMemo(
    () =>
      createRoundedSquarePlatformGeometry(
        tileSize,
        thickness,
        fieldConfig.platform.cornerRadius,
        fieldConfig.platform.edgeBevel,
      ),
    [
      tileSize,
      thickness,
      fieldConfig.platform.cornerRadius,
      fieldConfig.platform.edgeBevel,
    ],
  );
  const fallbackTexture = useMemo(
    () => createSolidTileTexture(theme.surfaceRaised),
    [theme.surfaceRaised],
  );
  const material = useMemo(
    () => createFieldGridWaveMaterial(fallbackTexture, { depthWrite: true }),
    [fallbackTexture],
  );

  useEffect(() => {
    void hydrateFieldTileTextureUri();
  }, []);

  useEffect(() => {
    let active = true;
    let releaseTexture: (() => void) | null = null;
    setCustomTexture(null);

    if (settings.textureUri === null) {
      return () => {
        active = false;
      };
    }

    void acquireFieldTileTexture(settings.textureUri)
      .then((acquired) => {
        if (!active) {
          acquired.release();
          return;
        }
        releaseTexture = acquired.release;
        setCustomTexture(acquired.texture);
      })
      .catch((error: unknown) => {
        if (active) console.warn('Unable to load the selected tile texture', error);
      });

    return () => {
      active = false;
      releaseTexture?.();
    };
  }, [settings.textureUri]);

  useLayoutEffect(() => {
    material.uniforms.uMap.value = customTexture ?? fallbackTexture;
    if (customTexture !== null) customTexture.needsUpdate = true;
  }, [material, customTexture, fallbackTexture]);

  useEffect(() => {
    if (chunkIndex === null) return;
    return registerFieldGridWaveMaterial(material);
  }, [chunkIndex, material]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => fallbackTexture.dispose(), [fallbackTexture]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;
    if (chunkIndex === null) {
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
        const isOccupied = occupiedCellKeys.has(col + ':' + row);
        if (!settings.generatedTilesEnabled && !isOccupied) continue;

        const topHeight = isOccupied
          ? objectPlatformHeight(
              settings.worldSeed,
              col,
              row,
              settings.objectMinHeight,
              settings.objectMaxHeight,
            )
          : fieldTileVariant(settings.worldSeed, col, row, tileHeights).height * 2;
        const center = cellCenterOnPlane(col, row, gridConfig);

        // Geometry is always six units thick (or the configured type thickness).
        // Only its top elevation differs from cell to cell.
        temp.position.set(center[0], center[1], topHeight - thickness / 2);
        temp.rotation.set(0, 0, 0);
        temp.scale.set(1, 1, 1);
        temp.updateMatrix();
        mesh.setMatrixAt(count, temp.matrix);
        count += 1;
      }
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [
    chunkIndex,
    base.rows,
    base.cellSize,
    base.dividerWidth,
    base.showDividers,
    thickness,
    occupiedCellKeys,
    fieldConfig.chunks.cols,
    settings.generatedTilesEnabled,
    settings.worldSeed,
    settings.tileMinHeight,
    settings.tileMaxHeight,
    settings.objectMinHeight,
    settings.objectMaxHeight,
  ]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh !== null) mesh.visible = chunkIndex !== null;
  }, [chunkIndex]);

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
