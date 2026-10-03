import { useFrame } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import { ArrowHelper, Color, Mesh, MeshBasicMaterial, Vector3 } from 'three';

import {
  resolveActiveWorldAxis,
  useFieldCameraControlStore,
} from './fieldCameraControlStore';
import type { WorldAxis } from './fieldCameraMotion';
import {
  WORLD_AXIS_HEAD_LENGTH,
  WORLD_AXIS_HEAD_WIDTH,
  WORLD_AXIS_LENGTH,
  WORLD_AXIS_LIFT_Z,
  WORLD_AXIS_RENDER_ORDER,
  WORLD_ORIGIN_RADIUS,
  axisDisplayColor,
  configureAxisOverlayObject,
  configureOverlayMaterial,
  originDisplayColor,
} from './fieldWorldAxes';

function createAxisArrow(
  dir: readonly [number, number, number],
  axis: WorldAxis,
): ArrowHelper {
  const helper = new ArrowHelper(
    new Vector3(...dir),
    new Vector3(0, 0, 0),
    WORLD_AXIS_LENGTH,
    axisDisplayColor(axis, null),
    WORLD_AXIS_HEAD_LENGTH,
    WORLD_AXIS_HEAD_WIDTH,
  );
  configureAxisOverlayObject(helper);
  return helper;
}

/** RGB gizmo at shared world/mesh origin (left-edge center of the deck). */
export function FieldWorldAxes(): ReactElement {
  const originRef = useRef<Mesh>(null);
  const arrows = useMemo(
    () =>
      [
        { id: 'x' as const, arrow: createAxisArrow([1, 0, 0], 'x') },
        { id: 'y' as const, arrow: createAxisArrow([0, 1, 0], 'y') },
        { id: 'z' as const, arrow: createAxisArrow([0, 0, 1], 'z') },
      ] as const,
    [],
  );

  useEffect(
    () => () => {
      for (const { arrow } of arrows) arrow.dispose();
    },
    [arrows],
  );

  const colorScratch = useMemo(() => new Color(), []);

  useFrame(() => {
    const state = useFieldCameraControlStore.getState();
    const active = resolveActiveWorldAxis(state.activeWorldAxis, state.activeAxisUntil);
    for (const { id, arrow } of arrows) {
      arrow.setColor(colorScratch.set(axisDisplayColor(id, active)));
      // setColor can touch materials; keep overlay flags sticky on native GL.
      configureAxisOverlayObject(arrow);
    }
    const material = originRef.current?.material;
    if (material instanceof MeshBasicMaterial) {
      material.color.set(originDisplayColor(active));
      configureOverlayMaterial(material);
    }
  });

  return (
    <group position={[0, 0, WORLD_AXIS_LIFT_Z]}>
      <mesh ref={originRef} renderOrder={WORLD_AXIS_RENDER_ORDER}>
        <sphereGeometry args={[WORLD_ORIGIN_RADIUS, 16, 16]} />
        <meshBasicMaterial
          color={originDisplayColor(null)}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {arrows.map(({ id, arrow }) => (
        <primitive key={id} object={arrow} />
      ))}
    </group>
  );
}
