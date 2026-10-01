import { memo, type ReactElement, useMemo } from 'react';
import { Color, DoubleSide, Euler, InstancedMesh, Matrix4, MeshStandardMaterial, PlaneGeometry } from 'three';

import { useThemeColors } from '@/design-system/colors/colors';

import { BRIDGE_COLUMN_COUNT } from '@/domains/surfaces/domain/services/spawnBridgeRow';

import { bridgeCellToWorld, FIELD_CELL_SIZE, FIELD_PLATFORM_Y } from './fieldLayout';

type BridgeSurfaceProps = {
  readonly maxRow: number;
};

const Y_UP = new Euler(-Math.PI / 2, 0, 0);

/**
 * Checkerboard bridge as two InstancedMeshes (even/odd cells) — one draw call each.
 */
function BridgeSurfaceComponent({ maxRow }: BridgeSurfaceProps): ReactElement {
  const theme = useThemeColors();
  const visibleRows = Math.max(28, maxRow + 14);
  const size = FIELD_CELL_SIZE * 0.94;

  const { evenMesh, oddMesh } = useMemo(() => {
    const geometry = new PlaneGeometry(size, size);
    const evenMat = new MeshStandardMaterial({
      color: new Color(theme.surfaceRaised),
      transparent: true,
      opacity: 0.82,
      side: DoubleSide,
    });
    const oddMat = new MeshStandardMaterial({
      color: new Color(theme.surfaceSunken),
      transparent: true,
      opacity: 0.82,
      side: DoubleSide,
    });

    let evenCount = 0;
    let oddCount = 0;
    for (let row = 0; row <= visibleRows; row += 1) {
      for (let col = 0; col < BRIDGE_COLUMN_COUNT; col += 1) {
        if ((row + col) % 2 === 0) {
          evenCount += 1;
        } else {
          oddCount += 1;
        }
      }
    }

    const even = new InstancedMesh(geometry, evenMat, evenCount);
    const odd = new InstancedMesh(geometry, oddMat, oddCount);
    const matrix = new Matrix4();
    let evenIndex = 0;
    let oddIndex = 0;

    for (let row = 0; row <= visibleRows; row += 1) {
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
    return { evenMesh: even, oddMesh: odd };
  }, [size, theme.surfaceRaised, theme.surfaceSunken, visibleRows]);

  return (
    <group position={[0, FIELD_PLATFORM_Y, 0]}>
      <primitive object={evenMesh} />
      <primitive object={oddMesh} />
    </group>
  );
}

export const BridgeSurface = memo(BridgeSurfaceComponent);
