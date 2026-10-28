import { useThree } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Matrix4,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from 'three';

import { useFieldTileStore } from './fieldTileStore';
import { iterateFieldGrassInstances } from './fieldGrassGeneration';
import { FIELD_GRASS_MATERIAL, loadFieldGrassSprite } from './fieldGrassMaterial';
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
  const grassConfig = fieldConfig.grass;
  const generationToken = useRef(0);
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
  // Keep allocation stable while tweaking spacing; only the explicit capacity
  // setting reallocates GPU buffers.
  const capacity = Math.max(1, Math.floor(grassConfig.maxInstancesPerChunk));

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
  const dummy = useMemo(() => new Object3D(), []);
  const cameraForward = useMemo(() => new Vector3(), []);
  const cameraRight = useMemo(() => new Vector3(), []);
  const worldUp = useMemo(() => new Vector3(0, 0, 1), []);
  const billboardNormal = useMemo(() => new Vector3(), []);
  const billboardMatrix = useMemo(() => new Matrix4(), []);
  const billboardQuaternion = useMemo(() => new Quaternion(), []);

  useEffect(() => {
    void loadFieldGrassSprite();
    return () => geometry.dispose();
  }, [geometry]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;

    // Slot recycling is common during world streaming. Invalidate the previous
    // iterator before starting another chunk so stale batches cannot write into it.
    const token = generationToken.current + 1;
    generationToken.current = token;
    let active = true;
    let frameId: number | null = null;
    let written = 0;
    let finished = false;

    mesh.count = 0;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);

    if (chunkIndex === null || !grassConfig.enabled) {
      return () => {
        active = false;
        if (generationToken.current === token) generationToken.current += 1;
      };
    }

    const iterator = iterateFieldGrassInstances({
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
      occupiedCellKeys,
      spacing: grassConfig.spacing,
      bladeWidth: grassConfig.bladeWidth,
      bladeHeight: grassConfig.bladeHeight,
      edgeMargin: grassConfig.edgeMargin,
      jitterRatio: grassConfig.jitterRatio,
      occupiedClearanceRatio: grassConfig.occupiedClearanceRatio,
      accentProbability1: grassConfig.accentProbability1,
      accentProbability2: grassConfig.accentProbability2,
    });
    const batchSize = Math.max(1, Math.floor(grassConfig.generationBatchSize));
    const seedAttribute = geometry.getAttribute('aGrassSeed') as InstancedBufferAttribute;
    const dimensionsAttribute = geometry.getAttribute('aGrassDimensions') as InstancedBufferAttribute;
    const accentAttribute = geometry.getAttribute('aGrassAccent') as InstancedBufferAttribute;

    const processBatch = (): void => {
      if (!active || generationToken.current !== token) return;

      camera.getWorldDirection(cameraForward);
      cameraForward.z = 0;
      if (cameraForward.lengthSq() < 0.0001) cameraForward.set(1, 0, 0);
      cameraForward.normalize();
      cameraRight.crossVectors(cameraForward, worldUp).normalize();
      billboardNormal.crossVectors(cameraRight, worldUp).normalize();
      billboardMatrix.makeBasis(cameraRight, worldUp, billboardNormal);
      billboardQuaternion.setFromRotationMatrix(billboardMatrix);

      const rangeStart = written;
      let produced = 0;
      while (produced < batchSize && written < capacity) {
        const next = iterator.next();
        if (next.done) {
          finished = true;
          break;
        }

        const instance = next.value;
        dummy.position.set(
          instance.x,
          instance.y,
          instance.rootZ +
            instance.height / 2 +
            (instance.accent === 1
              ? grassConfig.accentOffset1
              : instance.accent === 2
                ? grassConfig.accentOffset2
                : 0),
        );
        dummy.quaternion.copy(billboardQuaternion);
        dummy.scale.set(instance.width, instance.height, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(written, dummy.matrix);

        seedData[written] = instance.seed;
        dimensionsData[written * 2] = instance.width;
        dimensionsData[written * 2 + 1] = instance.height;
        accentData[written] = instance.accent;
        written += 1;
        produced += 1;
      }

      const rangeCount = written - rangeStart;
      mesh.count = written;
      if (rangeCount > 0) {
        mesh.instanceMatrix.addUpdateRange(rangeStart * 16, rangeCount * 16);
        mesh.instanceMatrix.needsUpdate = true;
        seedAttribute.addUpdateRange(rangeStart, rangeCount);
        dimensionsAttribute.addUpdateRange(rangeStart * 2, rangeCount * 2);
        accentAttribute.addUpdateRange(rangeStart, rangeCount);
        seedAttribute.needsUpdate = true;
        dimensionsAttribute.needsUpdate = true;
        accentAttribute.needsUpdate = true;
      }

      // frustumCulled is disabled on this mesh, so computing a new bounding
      // sphere for every streamed chunk would only add unnecessary CPU work.
      if (!finished && written < capacity) {
        frameId = requestAnimationFrame(processBatch);
      }
    };

    frameId = requestAnimationFrame(processBatch);
    return () => {
      active = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (generationToken.current === token) generationToken.current += 1;
    };
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
    occupiedCellKeys,
    grassConfig,
    camera,
    cameraForward,
    cameraRight,
    worldUp,
    billboardNormal,
    billboardMatrix,
    billboardQuaternion,
    dummy,
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
      receiveShadow={grassConfig.receiveShadows}
      frustumCulled={false}
      renderOrder={1.2}
    />
  );
}
