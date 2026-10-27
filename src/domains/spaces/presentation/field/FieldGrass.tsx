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

import { useFieldTileStore } from './fieldTileStore';
import {
  FIELD_GRASS_SPACING,
  generateFieldGrassInstances,
} from './fieldGrassGeneration';
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

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;

    if (chunkIndex === null) {
      mesh.count = 0;
      mesh.instanceMatrix.needsUpdate = true;
      return;
    }

    const instances = generateFieldGrassInstances({
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
    });

    camera.getWorldDirection(cameraForward);
    cameraForward.z = 0;
    if (cameraForward.lengthSq() < 0.0001) cameraForward.set(1, 0, 0);
    cameraForward.normalize();
    cameraRight.crossVectors(cameraForward, worldUp).normalize();
    billboardNormal.crossVectors(cameraRight, worldUp).normalize();
    billboardMatrix.makeBasis(cameraRight, worldUp, billboardNormal);
    billboardQuaternion.setFromRotationMatrix(billboardMatrix);

    const count = Math.min(instances.length, capacity);
    for (let index = 0; index < count; index += 1) {
      const instance = instances[index]!;
      dummy.position.set(
        instance.x,
        instance.y,
        instance.rootZ + instance.height / 2 + (instance.accent === 1 ? 10 : instance.accent === 2 ? 18.5 : 0),
      );
      dummy.quaternion.copy(billboardQuaternion);
      dummy.scale.set(instance.width, instance.height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);

      seedData[index] = instance.seed;
      dimensionsData[index * 2] = instance.width;
      dimensionsData[index * 2 + 1] = instance.height;
      accentData[index] = instance.accent;
    }

    mesh.count = count;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    geometry.getAttribute('aGrassSeed').needsUpdate = true;
    geometry.getAttribute('aGrassDimensions').needsUpdate = true;
    geometry.getAttribute('aGrassAccent').needsUpdate = true;
    mesh.computeBoundingSphere();
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
      receiveShadow
      frustumCulled={false}
      renderOrder={1.2}
    />
  );
}
