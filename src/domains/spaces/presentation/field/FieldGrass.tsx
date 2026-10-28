import { useThree } from '@react-three/fiber/native';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  PlaneGeometry,
  Vector3,
  type InstancedMesh,
} from 'three';

import { useFieldTileStore } from './fieldTileStore';
import {
  createFieldGrassRenderData,
  FIELD_GRASS_SPACING,
  getCachedFieldGrassRenderData,
  type FieldGrassGenerationOptions,
} from './fieldGrassGeneration';
import { FIELD_GRASS_MATERIAL, loadFieldGrassSprite } from './fieldGrassMaterial';
import {
  fieldChunkOccupiedCellKeys,
  fieldChunkOccupiedCellsSignature,
} from './fieldGridChunks';
import {
  FIELD_GRID_DIVIDER_WIDTH,
  fieldGridWorldSize,
  type FieldGridConfig,
} from './fieldGridConfig';
import { useFieldConfig } from './useFieldConfig';

type FieldGrassProps = {
  readonly chunkIndex: number | null;
  readonly base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth'>;
  readonly occupiedCellKeys: ReadonlySet<string>;
};

/**
 * Continuous grass for one streamed world chunk. The underlying distribution is
 * a world-aligned jittered lattice, not a per-cell spawn rule, so neighbouring
 * chunks line up and cell boundaries do not dictate grass placement.
 */
export function FieldGrass({
  chunkIndex,
  base,
  occupiedCellKeys,
}: FieldGrassProps): ReactElement {
  const camera = useThree((state) => state.camera);
  const fieldConfig = useFieldConfig();
  const worldSeed = useFieldTileStore((state) => state.worldSeed);
  const generatedTilesEnabled = useFieldTileStore((state) => state.generatedTilesEnabled);
  const tileMinHeight = useFieldTileStore((state) => state.tileMinHeight);
  const tileMaxHeight = useFieldTileStore((state) => state.tileMaxHeight);
  const objectMinHeight = useFieldTileStore((state) => state.objectMinHeight);
  const objectMaxHeight = useFieldTileStore((state) => state.objectMaxHeight);

  const dividerWidth = base.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH;
  const chunkCols = fieldConfig.chunks.cols;
  const platformHeight = fieldConfig.platform.height;
  const grid = useMemo(
    () => ({
      rows: base.rows,
      cellSize: base.cellSize,
      dividerWidth,
    }),
    [base.rows, base.cellSize, dividerWidth],
  );
  const occupiedCellsSignature = useMemo(
    () => fieldChunkOccupiedCellsSignature(chunkIndex, chunkCols, base.rows, occupiedCellKeys),
    [chunkIndex, chunkCols, base.rows, occupiedCellKeys],
  );
  const chunkOccupiedCellKeys = useMemo(
    () => fieldChunkOccupiedCellKeys(chunkIndex, chunkCols, occupiedCellsSignature),
    [chunkIndex, chunkCols, occupiedCellsSignature],
  );
  const worldSize = useMemo(
    () =>
      fieldGridWorldSize({
        cols: chunkCols,
        rows: base.rows,
        cellSize: base.cellSize,
        dividerWidth,
        showDividers: false,
      }),
    [chunkCols, base.rows, base.cellSize, dividerWidth],
  );

  // The extra rows account for jitter at lattice edges; invalid positions are
  // discarded by the generator. This bounds allocation per chunk.
  const capacity = Math.max(
    1,
    (Math.ceil(worldSize.width / FIELD_GRASS_SPACING) + 4) *
      (Math.ceil(worldSize.height / FIELD_GRASS_SPACING) + 4),
  );

  const seedData = useMemo(() => new Float32Array(capacity), [capacity]);
  const dimensionsData = useMemo(() => new Float32Array(capacity * 2), [capacity]);
  const accentData = useMemo(() => new Float32Array(capacity), [capacity]);
  const geometry = useMemo(() => {
    const nextGeometry = new PlaneGeometry(1, 1, 1, 1);
    const seedAttribute = new InstancedBufferAttribute(seedData, 1);
    const dimensionsAttribute = new InstancedBufferAttribute(dimensionsData, 2);
    const accentAttribute = new InstancedBufferAttribute(accentData, 1);
    seedAttribute.setUsage(DynamicDrawUsage);
    dimensionsAttribute.setUsage(DynamicDrawUsage);
    accentAttribute.setUsage(DynamicDrawUsage);
    nextGeometry.setAttribute('aGrassSeed', seedAttribute);
    nextGeometry.setAttribute('aGrassDimensions', dimensionsAttribute);
    nextGeometry.setAttribute('aGrassAccent', accentAttribute);
    return nextGeometry;
  }, [seedData, dimensionsData, accentData]);
  const meshRef = useRef<InstancedMesh>(null);
  const cameraForward = useMemo(() => new Vector3(), []);

  useEffect(() => {
    void loadFieldGrassSprite();
    return () => geometry.dispose();
  }, [geometry]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;

    if (chunkIndex === null) {
      mesh.count = 0;
      mesh.instanceMatrix.needsUpdate = true;
      return;
    }

    const generationOptions: FieldGrassGenerationOptions = {
      chunkIndex,
      chunkCols,
      grid,
      worldSeed,
      tileMinHeight,
      tileMaxHeight,
      platformHeight,
      objectMinHeight,
      objectMaxHeight,
      generatedTilesEnabled,
      occupiedCellKeys: chunkOccupiedCellKeys,
    };

    camera.getWorldDirection(cameraForward);
    cameraForward.z = 0;
    if (cameraForward.lengthSq() < 0.0001) cameraForward.set(1, 0, 0);
    cameraForward.normalize();

    // Normally the complete matrices/attributes are prepared before this chunk mounts.
    // The synchronous fallback only covers startup and a camera turn during prefetch.
    const renderData =
      getCachedFieldGrassRenderData(
        generationOptions,
        cameraForward.x,
        cameraForward.y,
      ) ??
      createFieldGrassRenderData(
        generationOptions,
        cameraForward.x,
        cameraForward.y,
      );

    const count = Math.min(renderData.count, capacity);
    mesh.instanceMatrix.array.set(renderData.matrices.subarray(0, count * 16), 0);
    seedData.set(renderData.seeds.subarray(0, count), 0);
    dimensionsData.set(renderData.dimensions.subarray(0, count * 2), 0);
    accentData.set(renderData.accents.subarray(0, count), 0);
    mesh.count = count;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    geometry.getAttribute('aGrassSeed').needsUpdate = true;
    geometry.getAttribute('aGrassDimensions').needsUpdate = true;
    geometry.getAttribute('aGrassAccent').needsUpdate = true;
  }, [
    chunkIndex,
    chunkCols,
    grid,
    worldSeed,
    tileMinHeight,
    tileMaxHeight,
    platformHeight,
    objectMinHeight,
    objectMaxHeight,
    generatedTilesEnabled,
    chunkOccupiedCellKeys,
    camera,
    cameraForward,
    capacity,
    geometry,
    seedData,
    dimensionsData,
    accentData,
  ]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, FIELD_GRASS_MATERIAL, capacity]}
      castShadow={false}
      receiveShadow
      frustumCulled={false}
      renderOrder={1.2}
    />
  );
}
