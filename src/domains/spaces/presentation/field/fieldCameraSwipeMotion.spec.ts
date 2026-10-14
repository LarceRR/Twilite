import { PerspectiveCamera } from 'three';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFieldCameraControlStore } from './fieldCameraControlStore';
import { getFieldConfig, useFieldConfigStore } from './fieldConfigStore';
import {
  applyPendingCameraSwipeMovement,
  beginCameraSwipe,
  cancelCameraSwipeMotion,
  finishCameraSwipe,
  updateCameraSwipe,
} from './fieldCameraSwipeMotion';

describe('fieldCameraSwipeMotion', () => {
  beforeEach(() => {
    cancelCameraSwipeMotion({ x: -323, y: 0, z: 171 });
    useFieldConfigStore.getState().reset();
    useFieldCameraControlStore.setState({
      position: { x: -323, y: 0, z: 171 },
      rotationDeg: { x: 83, y: 0, z: -90 },
      revision: 0,
      userAdjusted: false,
    });
  });

  it('moves the runtime camera during a swipe and commits once at the end', () => {
    const camera = new PerspectiveCamera();
    camera.position.set(-323, 0, 171);

    beginCameraSwipe();
    updateCameraSwipe(10);
    applyPendingCameraSwipeMovement(camera, 1 / 60);

    expect(camera.position.x).toBeGreaterThan(-323);
    expect(camera.position.x).toBeCloseTo(-313, 5);
    expect(useFieldCameraControlStore.getState().position).toEqual({
      x: -323,
      y: 0,
      z: 171,
    });
    expect(useFieldCameraControlStore.getState().revision).toBe(0);

    finishCameraSwipe();

    const state = useFieldCameraControlStore.getState();
    expect(state.position.x).toBeCloseTo(camera.position.x, 5);
    expect(state.position.z).toBe(171);
    expect(camera.position.z).toBe(171);
    expect(state.revision).toBe(1);
  });

  it('does not move backward past the initial camera position', () => {
    useFieldCameraControlStore.setState({ position: { x: -308, y: 0, z: 171 } });
    const camera = new PerspectiveCamera();
    camera.position.set(-308, 0, 171);

    beginCameraSwipe();
    updateCameraSwipe(-30);
    for (let frame = 0; frame < 30; frame += 1) {
      applyPendingCameraSwipeMovement(camera, 1 / 60);
    }
    finishCameraSwipe();

    expect(camera.position.x).toBeCloseTo(-323, 5);
    expect(useFieldCameraControlStore.getState().position.x).toBeCloseTo(camera.position.x, 5);
  });

  it('continues moving with decaying inertia after release', () => {
    const camera = new PerspectiveCamera();
    camera.position.set(-323, 0, 171);

    beginCameraSwipe();
    updateCameraSwipe(2, 100);
    applyPendingCameraSwipeMovement(camera, 1 / 60);
    finishCameraSwipe(0);

    const releaseX = camera.position.x;
    applyPendingCameraSwipeMovement(camera, 0.05);
    const firstStep = camera.position.x - releaseX;
    applyPendingCameraSwipeMovement(camera, 0.05);
    const secondStep = camera.position.x - releaseX - firstStep;

    expect(firstStep).toBeGreaterThan(0);
    expect(secondStep).toBeGreaterThan(0);
    expect(secondStep).toBeLessThan(firstStep);

    for (let frame = 0; frame < 100; frame += 1) {
      applyPendingCameraSwipeMovement(camera, 0.05);
    }

    expect(camera.position.z).toBe(171);
    expect(useFieldCameraControlStore.getState().position.x).toBeCloseTo(camera.position.x, 5);
  });

  it('preserves swipe velocity when control transfers to inertia', () => {
    const camera = new PerspectiveCamera();
    camera.position.set(-323, 0, 171);
    const releaseVelocity = 600;

    beginCameraSwipe();
    updateCameraSwipe(0, releaseVelocity);
    finishCameraSwipe(releaseVelocity);

    const releaseX = camera.position.x;
    applyPendingCameraSwipeMovement(camera, 1 / 60);

    const firstFrameDistance = camera.position.x - releaseX;
    const distanceAtConstantSpeed =
      (releaseVelocity * getFieldConfig().camera.swipeInertiaSpeedScale) / 60;

    // Friction starts immediately, but the first frame should remain close to
    // the finger's last velocity instead of dropping to a small fraction.
    expect(firstFrameDistance).toBeGreaterThan(distanceAtConstantSpeed * 0.9);
    expect(firstFrameDistance).toBeLessThan(distanceAtConstantSpeed * 1.01);

    // Drain the remaining coast so module-level animation state cannot leak
    // into the next test.
    for (let frame = 0; frame < 100; frame += 1) {
      applyPendingCameraSwipeMovement(camera, 0.05);
    }
  });

  it('cancels pending inertia at the rendered camera position on unmount', () => {
    const camera = new PerspectiveCamera();
    camera.position.set(-323, 0, 171);

    beginCameraSwipe();
    updateCameraSwipe(0, 600);
    finishCameraSwipe(600);
    applyPendingCameraSwipeMovement(camera, 0.05);

    const renderedPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    cancelCameraSwipeMotion(camera.position);

    expect(useFieldCameraControlStore.getState().position).toEqual(renderedPosition);
    applyPendingCameraSwipeMovement(camera, 0.05);
    expect(camera.position.x).toBeCloseTo(renderedPosition.x, 5);
    expect(useFieldCameraControlStore.getState().position).toEqual(renderedPosition);
  });

  it('increases coast distance with flick speed and caps the strongest flick', () => {
    const coastDistance = (velocityY: number): number => {
      useFieldCameraControlStore.setState({
        position: { x: -323, y: 0, z: 171 },
        revision: 0,
        userAdjusted: false,
      });
      const camera = new PerspectiveCamera();
      camera.position.set(-323, 0, 171);

      beginCameraSwipe();
      updateCameraSwipe(0, velocityY);
      finishCameraSwipe(velocityY);
      for (let frame = 0; frame < 100; frame += 1) {
        applyPendingCameraSwipeMovement(camera, 0.05);
      }
      return camera.position.x + 323;
    };

    const gentleFlickDistance = coastDistance(200);
    const regularFlickDistance = coastDistance(1000);
    const strongFlickDistance = coastDistance(2000);
    const cappedFlickDistance = coastDistance(4000);
    const fasterCappedFlickDistance = coastDistance(8000);

    expect(regularFlickDistance).toBeGreaterThan(gentleFlickDistance);
    expect(strongFlickDistance).toBeGreaterThan(regularFlickDistance);
    expect(cappedFlickDistance).toBeGreaterThan(strongFlickDistance);
    expect(cappedFlickDistance).toBeCloseTo(fasterCappedFlickDistance, 5);
  });
});
