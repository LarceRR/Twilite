import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { bridgeDeckCellCorners } from './bridgeDeckGeometry';
import { createDefaultFieldCameraPose, FIELD_CAMERA } from './fieldCameraDefaults';
import { BLENDER_FILM_GAUGE_MM } from './fieldCameraOptics';
import {
  type FieldCameraPose,
  fovFromPose,
  lookAtFromPose,
  poseFromPositionLookAt,
} from './fieldCameraPose';
import {
  buildViewportHighlightIndices,
  buildViewportHighlightPositions,
  listViewportCells,
  VIEWPORT_CELL_HIGHLIGHT,
  VIEWPORT_CELL_HIGHLIGHT_OPACITY,
  VIEWPORT_CELL_HIGHLIGHT_Y,
} from './viewportCells';

const ASPECT = 390 / 844;

describe('listViewportCells', () => {
  it('includes the cell under a camera aimed at that cell', () => {
    const camera = cameraFromPose(
      poseFromPositionLookAt({ x: 0.5, y: 4, z: 1 }, { x: 0.5, y: 0, z: -2 }, 40, ASPECT),
    );
    const cells = listViewportCells(8, 0, 0, camera);
    expect(cells).toContainEqual({ column: 7, row: 2 });
  });

  it('highlights part of the bridge from the default field pose', () => {
    const camera = cameraFromPose(createDefaultFieldCameraPose());
    expect(listViewportCells(28, 1, 0, camera).length).toBeGreaterThan(0);
  });

  it('skips cells behind the camera', () => {
    const camera = cameraFromPose(
      poseFromPositionLookAt({ x: 0, y: 2, z: -40 }, { x: 0, y: 2, z: -50 }, 40, ASPECT),
    );
    expect(listViewportCells(8, 0, 0, camera)).toEqual([]);
  });

  it('skips the bridge when the camera looks away to the side', () => {
    const camera = cameraFromPose(
      poseFromPositionLookAt({ x: 40, y: 2, z: -2 }, { x: 50, y: 1.5, z: -2 }, 40, ASPECT),
    );
    expect(listViewportCells(8, 0, 0, camera)).toEqual([]);
  });
});

describe('buildViewportHighlightPositions', () => {
  it('lifts the visible cell quad without moving its tapered footprint', () => {
    const cell = { column: 7, row: 2 };
    const positions = buildViewportHighlightPositions([cell], 1, 0, 8);
    const corners = bridgeDeckCellCorners(7, 2, 1, 0, 8);
    expect(positions[0]).toBeCloseTo(corners[0].x);
    expect(positions[1]).toBeCloseTo(VIEWPORT_CELL_HIGHLIGHT_Y);
    expect(positions[2]).toBeCloseTo(corners[0].z);
    expect(positions[3]).toBeCloseTo(corners[1].x);
    expect(positions[11]).toBeCloseTo(corners[3].z);
    expect(VIEWPORT_CELL_HIGHLIGHT).toBe('#fdba2f');
    expect(VIEWPORT_CELL_HIGHLIGHT_OPACITY).toBe(0.5);
  });

  it('indexes one quad as two triangles', () => {
    expect(Array.from(buildViewportHighlightIndices(1))).toEqual([0, 1, 2, 0, 2, 3]);
  });
});

function cameraFromPose(pose: FieldCameraPose): PerspectiveCamera {
  const camera = new PerspectiveCamera();
  const lookAt = lookAtFromPose(pose);
  camera.filmGauge = BLENDER_FILM_GAUGE_MM;
  camera.fov = fovFromPose(pose, ASPECT);
  camera.aspect = ASPECT;
  camera.near = FIELD_CAMERA.near;
  camera.far = FIELD_CAMERA.far;
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.up.set(0, 1, 0);
  camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  if (Math.abs(pose.roll) > 1e-6) camera.rotateZ(pose.roll);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}
