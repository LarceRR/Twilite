import { describe, expect, it } from 'vitest';
import { ArrowHelper, Vector3 } from 'three';

import { worldAxisFromMove } from './fieldCameraMotion';
import {
  WORLD_AXIS_LIFT_Z,
  WORLD_AXIS_RENDER_ORDER,
  axisDisplayColor,
  configureAxisOverlayObject,
  originDisplayColor,
} from './fieldWorldAxes';

describe('fieldWorldAxes', () => {
  it('maps move controls onto Z-up RGB world axes', () => {
    expect(worldAxisFromMove('left')).toBe('x');
    expect(worldAxisFromMove('right')).toBe('x');
    expect(worldAxisFromMove('forward')).toBe('y');
    expect(worldAxisFromMove('back')).toBe('y');
    expect(worldAxisFromMove('up')).toBe('z');
    expect(worldAxisFromMove('down')).toBe('z');
  });

  it('brightens only the active axis color', () => {
    expect(axisDisplayColor('x', 'x')).toBe('#FF4D4D');
    expect(axisDisplayColor('x', 'y')).toBe('#B23B3B');
    expect(originDisplayColor('z')).toBe('#FFFFFF');
    expect(originDisplayColor(null)).toBe('#F5F5F5');
  });

  it('lifts the gizmo above the deck and disables depth occlusion', () => {
    expect(WORLD_AXIS_LIFT_Z).toBeGreaterThan(0);
    const arrow = new ArrowHelper(new Vector3(1, 0, 0), new Vector3(0, 0, 0), 10, 0xff0000);
    configureAxisOverlayObject(arrow);
    expect(arrow.renderOrder).toBe(WORLD_AXIS_RENDER_ORDER);
    expect(arrow.line.material.depthTest).toBe(false);
    expect(arrow.line.material.depthWrite).toBe(false);
    expect(arrow.cone.material.depthTest).toBe(false);
    expect(arrow.cone.material.depthWrite).toBe(false);
    arrow.dispose();
  });
});
