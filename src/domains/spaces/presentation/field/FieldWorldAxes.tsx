import { useFrame } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import { ArrowHelper, Color, Mesh, MeshBasicMaterial, Vector3 } from 'three';

import {
  resolveActiveWorldAxis,
  useFieldCameraControlStore,
} from './fieldCameraControlStore';
import type { WorldAxis } from './fieldCameraMotion';
import {
  axisDisplayColor,
  configureAxisOverlayObject,
  configureOverlayMaterial,
  originDisplayColor,
} from './worldAxisOverlay';
import { useFieldConfig } from './useFieldConfig';

function createAxisArrow(
  dir: readonly [number, number, number],
  axis: WorldAxis,
  length: number,
  headLength: number,
  headWidth: number,
): ArrowHelper {
  const helper = new ArrowHelper(
    new Vector3(...dir),
    new Vector3(0, 0, 0),
    length,
    axisDisplayColor(axis, null),
    headLength,
    headWidth,
  );
  configureAxisOverlayObject(helper);
  return helper;
}

/** RGB gizmo at shared world/mesh origin (left-edge center of the deck). */
export function FieldWorldAxes(): ReactElement {
  const axes = useFieldConfig().axes;
  const originRef = useRef<Mesh>(null);
  const arrows = useMemo(
    () =>
      [
        {
          id: 'x' as const,
          arrow: createAxisArrow(
            [1, 0, 0],
            'x',
            axes.length,
            axes.headLength,
            axes.headWidth,
          ),
        },
        {
          id: 'y' as const,
          arrow: createAxisArrow(
            [0, 1, 0],
            'y',
            axes.length,
            axes.headLength,
            axes.headWidth,
          ),
        },
        {
          id: 'z' as const,
          arrow: createAxisArrow(
            [0, 0, 1],
            'z',
            axes.length,
            axes.headLength,
            axes.headWidth,
          ),
        },
      ] as const,
    [axes.headLength, axes.headWidth, axes.length],
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
      configureAxisOverlayObject(arrow);
    }
    const material = originRef.current?.material;
    if (material instanceof MeshBasicMaterial) {
      material.color.set(originDisplayColor(active));
      configureOverlayMaterial(material);
    }
  });

  return (
    <group position={[0, 0, axes.liftZ]}>
      <mesh ref={originRef} renderOrder={axes.renderOrder}>
        <sphereGeometry args={[axes.originRadius, 16, 16]} />
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
