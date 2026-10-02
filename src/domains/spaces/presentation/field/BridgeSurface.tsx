import { useThree } from '@react-three/fiber/native';
import { memo, type ReactElement, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  DoubleSide,
  Euler,
  InstancedMesh,
  type Material,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';

import { useThemeColors } from '@/design-system/colors/colors';
import { BRIDGE_COLUMN_COUNT } from '@/domains/surfaces/domain/services/spawnBridgeRow';

import { bridgeInstanceCounts, bridgeRowCapacity, visibleBridgeRows } from './bridgeRows';
import { bridgeCellToWorld, FIELD_CELL_SIZE, FIELD_PLATFORM_Y } from './fieldLayout';

type BridgeSurfaceProps = {
  readonly maxRow: number;
};

const Y_UP = new Euler(-Math.PI / 2, 0, 0);
const TILE_SIZE = FIELD_CELL_SIZE * 0.94;

function createTileMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ transparent: true, opacity: 0.82, side: DoubleSide });
}

function buildBridgeMeshes(
  lastRow: number,
  geometry: PlaneGeometry,
  evenMaterial: Material,
  oddMaterial: Material,
): { even: InstancedMesh; odd: InstancedMesh } {
  const counts = bridgeInstanceCounts(lastRow);
  const even = new InstancedMesh(geometry, evenMaterial, counts.even);
  const odd = new InstancedMesh(geometry, oddMaterial, counts.odd);
  const matrix = new Matrix4();
  let evenIndex = 0;
  let oddIndex = 0;

  // Row-major fill: the first N instances are always rows 0..k, so `count`
  // alone decides how much of the bridge is drawn.
  for (let row = 0; row <= lastRow; row += 1) {
    for (let col = 0; col < BRIDGE_COLUMN_COUNT; col += 1) {
      const world = bridgeCellToWorld({ x: col, y: row });
      matrix.makeRotationFromEuler(Y_UP);
      matrix.setPosition(world.x, -0.012, world.z);
      if ((row + col) % 2 === 0) {
        even.setMatrixAt(evenIndex, matrix);
        evenIndex += 1;
      } else {
        odd.setMatrixAt(oddIndex, matrix);
        oddIndex += 1;
      }
    }
  }

  even.instanceMatrix.needsUpdate = true;
  odd.instanceMatrix.needsUpdate = true;
  // The bridge always spans the view; a cached bounding sphere would also go
  // stale when `count` grows.
  even.frustumCulled = false;
  odd.frustumCulled = false;

  return { even, odd };
}

/**
 * Checkerboard bridge as two InstancedMeshes (even/odd cells), one draw call each.
 *
 * Geometry and materials live for the whole mount; theme changes recolour in
 * place. Instance buffers grow in 32-row chunks and are disposed when replaced,
 * instead of a full rebuild (and a GPU leak) for every new row or theme switch.
 */
function BridgeSurfaceComponent({ maxRow }: BridgeSurfaceProps): ReactElement {
  const theme = useThemeColors();
  const invalidate = useThree((state) => state.invalidate);
  const lastRow = visibleBridgeRows(maxRow);
  const capacity = bridgeRowCapacity(lastRow);

  const geometry = useMemo(() => new PlaneGeometry(TILE_SIZE, TILE_SIZE), []);
  const materials = useMemo(() => ({ even: createTileMaterial(), odd: createTileMaterial() }), []);

  useEffect(
    () => () => {
      geometry.dispose();
      materials.even.dispose();
      materials.odd.dispose();
    },
    [geometry, materials],
  );

  useLayoutEffect(() => {
    materials.even.color.set(theme.surfaceRaised);
    materials.odd.color.set(theme.surfaceSunken);
    invalidate();
  }, [invalidate, materials, theme.surfaceRaised, theme.surfaceSunken]);

  const meshes = useMemo(
    () => buildBridgeMeshes(capacity, geometry, materials.even, materials.odd),
    [capacity, geometry, materials],
  );

  useEffect(
    () => () => {
      meshes.even.dispose();
      meshes.odd.dispose();
    },
    [meshes],
  );

  useLayoutEffect(() => {
    const counts = bridgeInstanceCounts(lastRow);
    meshes.even.count = counts.even;
    meshes.odd.count = counts.odd;
    invalidate();
  }, [invalidate, lastRow, meshes]);

  return (
    <group position={[0, FIELD_PLATFORM_Y, 0]}>
      <primitive object={meshes.even} />
      <primitive object={meshes.odd} />
    </group>
  );
}

export const BridgeSurface = memo(BridgeSurfaceComponent);
