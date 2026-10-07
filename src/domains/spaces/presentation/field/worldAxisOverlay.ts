import type { Material, Object3D } from 'three';

import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import type { WorldAxis } from './fieldCameraMotion';

export type AxisColorPair = {
  readonly dim: string;
  readonly bright: string;
};

/** Classic RGB gizmo: X red, Y green, Z blue. */
export const WORLD_AXIS_COLORS: Readonly<Record<WorldAxis, AxisColorPair>> = {
  x: { dim: '#B23B3B', bright: '#FF4D4D' },
  y: { dim: '#2F9E4F', bright: '#3DFF7A' },
  z: { dim: '#2F6FBF', bright: '#4DA3FF' },
};

export const WORLD_ORIGIN_COLOR = '#F5F5F5';
export const WORLD_ORIGIN_COLOR_ACTIVE = '#FFFFFF';

export const WORLD_AXIS_LENGTH = DEFAULT_FIELD_CONFIG.axes.length;
export const WORLD_AXIS_HEAD_LENGTH = DEFAULT_FIELD_CONFIG.axes.headLength;
export const WORLD_AXIS_HEAD_WIDTH = DEFAULT_FIELD_CONFIG.axes.headWidth;
export const WORLD_ORIGIN_RADIUS = DEFAULT_FIELD_CONFIG.axes.originRadius;
/** Lift above the XY deck so X/Y shafts are not buried in the mesh. */
export const WORLD_AXIS_LIFT_Z = DEFAULT_FIELD_CONFIG.axes.liftZ;
export const WORLD_AXIS_RENDER_ORDER = DEFAULT_FIELD_CONFIG.axes.renderOrder;

export function axisDisplayColor(
  axis: WorldAxis,
  active: WorldAxis | null,
): string {
  const pair = WORLD_AXIS_COLORS[axis];
  return active === axis ? pair.bright : pair.dim;
}

export function originDisplayColor(active: WorldAxis | null): string {
  return active == null ? WORLD_ORIGIN_COLOR : WORLD_ORIGIN_COLOR_ACTIVE;
}

export function configureOverlayMaterial(material: Material | Material[]): void {
  const list = Array.isArray(material) ? material : [material];
  for (const entry of list) {
    entry.depthTest = false;
    entry.depthWrite = false;
    entry.toneMapped = false;
  }
}

/** Keep the gizmo drawable over the deck even when shafts cross the mesh. */
export function configureAxisOverlayObject(object: Object3D): void {
  const renderOrder = getFieldConfig().axes.renderOrder;
  object.renderOrder = renderOrder;
  object.traverse((child) => {
    child.renderOrder = renderOrder;
    const maybeMesh = child as Object3D & { material?: Material | Material[] };
    if (maybeMesh.material != null) {
      configureOverlayMaterial(maybeMesh.material);
    }
  });
}
