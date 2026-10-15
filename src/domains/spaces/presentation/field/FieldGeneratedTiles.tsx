import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { InstancedMesh, type Mesh, Object3D, PlaneGeometry, type Texture } from 'three';

import { useThemeColors } from '@/design-system/colors/colors';

import { createRoundedSquarePlatformGeometry } from './fieldPlatformGeometry';
import { fieldGridCellPitch, type FieldGridConfig } from './fieldGridConfig';
import { cellCenterOnPlane } from './fieldGridCells';
import { registerFieldGridWaveMaterial } from './fieldGridWaveMaterial';
import {
  FIELD_TILE_HEIGHT_STEP,
  fieldTileMaxTopHeight,
  fieldTileVariant,
  objectPlatformHeight,
} from './fieldTileGeneration';
import { createFieldTileMaterial, setFieldTileMaterialMap } from './fieldTileMaterial';
import { useFieldTileStore } from './fieldTileStore';
import {
  acquireFieldTileTexture,
  createSolidTileTexture,
  hydrateFieldTileTextureUri,
} from './fieldTileTexture';
import { useFieldConfig } from './useFieldConfig';

/** The ground seen through gaps/corners between tiles is a darker shade of the tile color. */
const GROUND_SHADE = 0.42;

type FieldGeneratedTilesProps = {
  readonly chunkIndex: number | null;
  readonly base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth' | 'showDividers'>;
  readonly occupiedCellKeys: ReadonlySet<string>;
};

function shadeHex(hex: string, factor: number): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((character) => character + character).join('') : raw.slice(0, 6);
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return hex;
  const channel = (shift: number): string =>
    Math.round(((value >> shift) & 255) * factor)
      .toString(16)
      .padStart(2, '0');
  return '#' + channel(16) + channel(8) + channel(0);
}

/**
 * Every cell, occupied or not, is a solid column instance of the same lit tile
 * geometry. Columns always reach down to one shared ground level, so raised
 * tiles (including object platforms) never float above a hole, and their
 * walls are real geometry that receives directional light, shadows and candle
 * light. A dark lit ground plane closes the tiny gaps between rounded tiles.
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
  const groundRef = useRef<Mesh>(null);
  const [customTexture, setCustomTexture] = useState<Texture | null>(null);

  const thickness = Math.max(0.1, fieldConfig.platform.height);
  const tileSize = base.cellSize;
  const maxTop = fieldTileMaxTopHeight(settings);
  // The column spans from the highest possible top down to the shared ground.
  const groundZ = -thickness;
  const columnDepth = maxTop - groundZ;

  const geometry = useMemo(
    () =>
      createRoundedSquarePlatformGeometry(
        tileSize,
        columnDepth,
        fieldConfig.platform.cornerRadius,
        fieldConfig.platform.edgeBevel,
        thickness,
      ),
    [
      tileSize,
      columnDepth,
      thickness,
      fieldConfig.platform.cornerRadius,
      fieldConfig.platform.edgeBevel,
    ],
  );
  const groundGeometry = useMemo(() => new PlaneGeometry(1, 1, 1, 1), []);
  const fallbackTexture = useMemo(
    () => createSolidTileTexture(theme.surfaceRaised),
    [theme.surfaceRaised],
  );
  const groundTexture = useMemo(
    () => createSolidTileTexture(shadeHex(theme.surfaceRaised, GROUND_SHADE)),
    [theme.surfaceRaised],
  );
  const material = useMemo(() => createFieldTileMaterial(fallbackTexture), [fallbackTexture]);
  const groundMaterial = useMemo(() => createFieldTileMaterial(groundTexture), [groundTexture]);

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
    setFieldTileMaterialMap(material, customTexture ?? fallbackTexture);
    if (customTexture !== null) customTexture.needsUpdate = true;
  }, [material, customTexture, fallbackTexture]);

  useEffect(() => {
    if (chunkIndex === null) return;
    const unregisterTiles = registerFieldGridWaveMaterial(material);
    const unregisterGround = registerFieldGridWaveMaterial(groundMaterial);
    return () => {
      unregisterTiles();
      unregisterGround();
    };
  }, [chunkIndex, material, groundMaterial]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => groundMaterial.dispose(), [groundMaterial]);
  useEffect(() => () => fallbackTexture.dispose(), [fallbackTexture]);
  useEffect(() => () => groundTexture.dispose(), [groundTexture]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => groundGeometry.dispose(), [groundGeometry]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const ground = groundRef.current;
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
          : fieldTileVariant(settings.worldSeed, col, row, tileHeights).height *
            FIELD_TILE_HEIGHT_STEP;
        const center = cellCenterOnPlane(col, row, gridConfig);

        // Same geometry for every cell; only the top elevation differs. The
        // column bottom always sits at or below the shared ground level.
        temp.position.set(center[0], center[1], topHeight - columnDepth / 2);
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

    if (ground !== null) {
      const pitch = fieldGridCellPitch(gridConfig);
      const firstCol = chunkIndex * columnCount;
      const first = cellCenterOnPlane(firstCol, 0, gridConfig);
      const last = cellCenterOnPlane(firstCol + columnCount - 1, base.rows - 1, gridConfig);
      ground.position.set((first[0] + last[0]) / 2, (first[1] + last[1]) / 2, groundZ);
      ground.scale.set(Math.abs(last[0] - first[0]) + pitch, Math.abs(last[1] - first[1]) + pitch, 1);
      ground.updateMatrix();
    }
  }, [
    chunkIndex,
    base.rows,
    base.cellSize,
    base.dividerWidth,
    base.showDividers,
    columnDepth,
    groundZ,
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
    const ground = groundRef.current;
    if (ground !== null) ground.visible = chunkIndex !== null;
  }, [chunkIndex]);

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, fieldConfig.chunks.cols * base.rows]}
        castShadow
        receiveShadow
        frustumCulled={false}
        renderOrder={1}
      />
      <mesh
        ref={groundRef}
        geometry={groundGeometry}
        material={groundMaterial}
        receiveShadow
        renderOrder={0}
      />
    </>
  );
}
