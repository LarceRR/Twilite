import { useThree } from '@react-three/fiber/native';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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

import { FIELD_GRASS_BUFFER_CAPACITY } from './fieldConfig';
import { scheduleFieldGrassGeneration } from './fieldGrassGenerationScheduler';
import { useFieldTileStore } from './fieldTileStore';
import {
  fieldGrassOccupiedCellKeysSignature,
  iterateFieldGrassInstances,
} from './fieldGrassGeneration';
import { FIELD_GRASS_MATERIAL, loadFieldGrassSprite } from './fieldGrassMaterial';
import {
  FIELD_GRID_DIVIDER_WIDTH,
  type FieldGridConfig,
} from './fieldGridConfig';
import { useFieldConfig } from './useFieldConfig';

type FieldGrassProps = {
  readonly chunkIndex: number | null;
  readonly grassVisible: boolean;
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
  grassVisible,
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
  const occupiedCellKeysSignature = fieldGrassOccupiedCellKeysSignature(
    occupiedCellKeys,
    chunkIndex,
    chunkCols,
  );
  const chunkOccupiedCellKeys = useMemo(
    () => new Set<string>(
      occupiedCellKeysSignature === '' ? [] : occupiedCellKeysSignature.split('|'),
    ),
    [occupiedCellKeysSignature],
  );
  const grid = useMemo(
    () => ({
      rows: base.rows,
      cellSize: base.cellSize,
      dividerWidth,
    }),
    [base.rows, base.cellSize, dividerWidth],
  );
  const generationConfig = useMemo(
    () => ({
      enabled: grassConfig.enabled,
      spacing: grassConfig.spacing,
      bladeWidth: grassConfig.bladeWidth,
      bladeHeight: grassConfig.bladeHeight,
      maxInstancesPerChunk: grassConfig.maxInstancesPerChunk,
      generationBatchSize: grassConfig.generationBatchSize,
      maxGeneratedPerFrame: grassConfig.maxGeneratedPerFrame,
      edgeMargin: grassConfig.edgeMargin,
      jitterRatio: grassConfig.jitterRatio,
      occupiedClearanceRatio: grassConfig.occupiedClearanceRatio,
      accentProbability1: grassConfig.accentProbability1,
      accentProbability2: grassConfig.accentProbability2,
      accentOffset1: grassConfig.accentOffset1,
      accentOffset2: grassConfig.accentOffset2,
    }),
    [
      grassConfig.enabled,
      grassConfig.spacing,
      grassConfig.bladeWidth,
      grassConfig.bladeHeight,
      grassConfig.maxInstancesPerChunk,
      grassConfig.generationBatchSize,
      grassConfig.maxGeneratedPerFrame,
      grassConfig.edgeMargin,
      grassConfig.jitterRatio,
      grassConfig.occupiedClearanceRatio,
      grassConfig.accentProbability1,
      grassConfig.accentProbability2,
      grassConfig.accentOffset1,
      grassConfig.accentOffset2,
    ],
  );

  // Preallocate one stable mobile-sized buffer. The editable per-chunk limit
  // affects generation, not GPU allocation, so slider changes cannot churn buffers.
  const capacity = FIELD_GRASS_BUFFER_CAPACITY;
  const instanceLimit = Math.min(
    capacity,
    Math.max(1, Math.floor(generationConfig.maxInstancesPerChunk)),
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
  const dummy = useMemo(() => new Object3D(), []);
  const cameraForward = useMemo(() => new Vector3(), []);
  const cameraRight = useMemo(() => new Vector3(), []);
  const worldUp = useMemo(() => new Vector3(0, 0, 1), []);
  const billboardNormal = useMemo(() => new Vector3(), []);
  const billboardMatrix = useMemo(() => new Matrix4(), []);
  const billboardQuaternion = useMemo(() => new Quaternion(), []);

  useLayoutEffect(() => {
    // Reset only when the buffer's identity or chunk binding changes. Surface
    // GPU readiness controls visibility, not grass-buffer lifetime: clearing
    // the count when a surface becomes ready would discard a buffer generated
    // while that surface was still uploading.
    if (meshRef.current !== null) meshRef.current.count = 0;
  }, [chunkIndex, capacity, geometry]);

  useEffect(() => {
    void loadFieldGrassSprite();
    return () => geometry.dispose();
  }, [geometry]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;

    // Warm grass data as soon as a chunk is mounted, independently of the
    // grid texture's GPU-upload timing. The mesh itself remains hidden until its
    // matching surface is ready, so pre-generation cannot show floating grass.
    // Slot recycling invalidates the old iterator before any new batch can write.
    const token = generationToken.current + 1;
    generationToken.current = token;
    let active = true;
    let written = 0;
    let finished = false;

    mesh.count = 0;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);

    if (chunkIndex === null || !generationConfig.enabled) {
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
      occupiedCellKeys: chunkOccupiedCellKeys,
      maxInstances: instanceLimit,
      spacing: generationConfig.spacing,
      bladeWidth: generationConfig.bladeWidth,
      bladeHeight: generationConfig.bladeHeight,
      edgeMargin: generationConfig.edgeMargin,
      jitterRatio: generationConfig.jitterRatio,
      occupiedClearanceRatio: generationConfig.occupiedClearanceRatio,
      accentProbability1: generationConfig.accentProbability1,
      accentProbability2: generationConfig.accentProbability2,
    });
    const batchSize = Math.max(1, Math.floor(generationConfig.generationBatchSize));
    const seedAttribute = geometry.getAttribute('aGrassSeed') as InstancedBufferAttribute;
    const dimensionsAttribute = geometry.getAttribute('aGrassDimensions') as InstancedBufferAttribute;
    const accentAttribute = geometry.getAttribute('aGrassAccent') as InstancedBufferAttribute;

    const processBatch = (allowance: number): {
      readonly processed: number;
      readonly done: boolean;
    } => {
      if (!active || generationToken.current !== token) {
        return { processed: 0, done: true };
      }

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
      const targetCount = Math.max(1, Math.min(batchSize, Math.floor(allowance)));
      while (produced < targetCount && written < instanceLimit) {
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
              ? generationConfig.accentOffset1
              : instance.accent === 2
                ? generationConfig.accentOffset2
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

      // Keep the chunk hidden while its instance buffer is incomplete.
      // Even a spatially distributed prefix is visibly sparse, especially when
      // camera streaming recycles slots before their generation task has finished.
      // Reveal the full-density chunk atomically once its buffer is ready.
      const done = finished || written >= instanceLimit;
      mesh.count = done ? written : 0;

      // frustumCulled is disabled on this mesh, so computing a new bounding
      // sphere for every streamed chunk would only add unnecessary CPU work.
      return {
        processed: produced,
        done,
      };
    };

    const cancelScheduledGeneration = scheduleFieldGrassGeneration({
      batchSize,
      frameBudget: generationConfig.maxGeneratedPerFrame,
      process: processBatch,
    });
    return () => {
      active = false;
      cancelScheduledGeneration();
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
    chunkOccupiedCellKeys,
    generationConfig,
    instanceLimit,
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
      visible={grassVisible}
      args={[geometry, FIELD_GRASS_MATERIAL, capacity]}
      castShadow={false}
      receiveShadow={grassConfig.receiveShadows}
      frustumCulled={false}
      renderOrder={1.2}
    />
  );
}
