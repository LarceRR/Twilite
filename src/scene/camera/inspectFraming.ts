import { surfaceObjectMotion } from '@/design-system/motion/surface-objects';
import type { ModelExtents } from '@/scene/objects/core/modelExtents';
import { screenBoxBounds, type ScreenBox } from '@/scene/objects/core/screenBoxBounds';
import { clamp } from '@/shared/utils/math';

import { orbitScreenBasis, type Viewport, type WorldVector } from './cameraConfig';
import type { FreeZone } from './freeZone';

const DISTANCE_SOLVE_PASSES = 32;
const CENTERING_SOLVE_PASSES = 24;
const FRAME_SOLVE_PASSES = 8;

const SOLVE_EPSILON = 1e-5;
const FILL_EPSILON_PX = 0.1;
const CENTERED_ENOUGH_PX = 0.01;

export type InspectFramingInput = {
  readonly world: WorldVector;
  readonly extents: ModelExtents;
  readonly viewport: Viewport;
  readonly azimuth: number;
  /** Inspect keeps the angle the user is looking from, straight down included. */
  readonly elevation: number;
  readonly freeZone: FreeZone;
  readonly startDistance: number;
  readonly minDistance: number;
  readonly maxDistance: number;
  readonly fitFraction?: number;
};

export type InspectFraming = {
  readonly distance: number;
  readonly elevation: number;
  readonly target: WorldVector;
  /** Share of the free zone height the model ends up covering. */
  readonly fill: number;
  /** Where the model's box will sit — the free zone centre, when nothing clamps. */
  readonly centerY: number;
  /** True when the zoom limits stopped the fit short of the requested share. */
  readonly clamped: boolean;
};

function measure(
  input: InspectFramingInput,
  distance: number,
  target: WorldVector,
): ScreenBox | null {
  return screenBoxBounds(
    input.world,
    input.extents,
    input.viewport,
    orbitScreenBasis(
      {
        azimuth: input.azimuth,
        elevation: input.elevation,
        distance,
        target,
      },
      input.viewport,
    ),
  );
}

function shiftedTarget(target: WorldVector, up: WorldVector, shift: number): WorldVector {
  return {
    x: target.x + up.x * shift,
    y: target.y + up.y * shift,
    z: target.z + up.z * shift,
  };
}

function solveDistance(
  input: InspectFramingInput,
  target: WorldVector,
  wantedPx: number,
): {
  distance: number;
  box: ScreenBox | null;
  clamped: boolean;
} {
  let low = input.minDistance;
  let high = input.maxDistance;
  let distance = clamp(input.startDistance, low, high);

  if (wantedPx <= 0) {
    return {
      distance,
      box: measure(input, distance, target),
      clamped: false,
    };
  }

  const lowBox = measure(input, low, target);
  const highBox = measure(input, high, target);

  if (lowBox === null || highBox === null) {
    return {
      distance,
      box: measure(input, distance, target),
      clamped: false,
    };
  }

  // At min distance the object is already too small: we cannot get the
  // requested fill without violating the zoom limit.
  if (lowBox.rect.height < wantedPx) {
    return {
      distance: low,
      box: lowBox,
      clamped: true,
    };
  }

  // At max distance the object is still too large. The requested fill is
  // therefore reachable somewhere between min and max.
  if (highBox.rect.height > wantedPx) {
    return {
      distance: high,
      box: highBox,
      clamped: true,
    };
  }

  for (let pass = 0; pass < DISTANCE_SOLVE_PASSES; pass += 1) {
    distance = (low + high) / 2;

    const box = measure(input, distance, target);

    if (box === null || box.rect.height <= 0) {
      high = distance;
      continue;
    }

    const error = box.rect.height - wantedPx;

    if (Math.abs(error) <= SOLVE_EPSILON) {
      return {
        distance,
        box,
        clamped: false,
      };
    }

    if (error > 0) {
      // Too large -> move camera farther away.
      low = distance;
    } else {
      // Too small -> move camera closer.
      high = distance;
    }
  }

  distance = (low + high) / 2;

  return {
    distance,
    box: measure(input, distance, target),
    clamped: false,
  };
}

function solveCenterY(
  input: InspectFramingInput,
  distance: number,
  initialTarget: WorldVector,
  initialBox: ScreenBox | null,
): {
  target: WorldVector;
  box: ScreenBox | null;
} {
  if (initialBox === null) {
    return {
      target: initialTarget,
      box: null,
    };
  }

  let target = initialTarget;
  let box = initialBox;

  for (let pass = 0; pass < CENTERING_SOLVE_PASSES; pass += 1) {
    if (Math.abs(input.freeZone.centerY - box.rect.centerY) <= CENTERED_ENOUGH_PX) {
      break;
    }

    const { up } = box.basis;
    const currentErrorPx = input.freeZone.centerY - box.rect.centerY;

    const estimatedShift = currentErrorPx / Math.max(box.pixelsPerWorldUnit, 1e-6);

    const probeShift =
      Math.abs(estimatedShift) > 1e-4 ? estimatedShift * 0.5 : currentErrorPx >= 0 ? 1e-4 : -1e-4;

    const probeTarget = shiftedTarget(target, up, probeShift);
    const probeBox = measure(input, distance, probeTarget);

    if (probeBox === null) {
      break;
    }

    const responsePerWorld = (probeBox.rect.centerY - box.rect.centerY) / probeShift;

    if (Math.abs(responsePerWorld) < 1e-8) {
      break;
    }

    const exactShift = currentErrorPx / responsePerWorld;

    target = shiftedTarget(target, up, exactShift);

    const nextBox = measure(input, distance, target);

    if (nextBox === null) {
      break;
    }

    box = nextBox;
  }

  return {
    target,
    box,
  };
}

export function solveInspectFraming(input: InspectFramingInput): InspectFraming {
  const fitFraction = input.fitFraction ?? surfaceObjectMotion.inspect.fitFraction;

  const wantedPx = input.freeZone.height * fitFraction;

  let distance = clamp(input.startDistance, input.minDistance, input.maxDistance);

  let target: WorldVector = { ...input.world };
  let box: ScreenBox | null = null;
  let clamped = false;

  for (let pass = 0; pass < FRAME_SOLVE_PASSES; pass += 1) {
    const solvedDistance = solveDistance(
      {
        ...input,
        startDistance: distance,
      },
      target,
      wantedPx,
    );

    distance = solvedDistance.distance;
    clamped = solvedDistance.clamped;

    box = solvedDistance.box ?? measure(input, distance, target);

    const centered = solveCenterY(input, distance, target, box);

    target = centered.target;
    box = centered.box;

    if (box === null) {
      break;
    }

    const fillErrorPx = Math.abs(box.rect.height - wantedPx);

    const centerErrorPx = Math.abs(box.rect.centerY - input.freeZone.centerY);

    if (fillErrorPx <= FILL_EPSILON_PX && centerErrorPx <= CENTERED_ENOUGH_PX) {
      break;
    }
  }

  const finalBox = box ?? measure(input, distance, target);

  return {
    distance,
    elevation: input.elevation,
    target,
    fill:
      finalBox === null || input.freeZone.height <= 0
        ? 0
        : finalBox.rect.height / input.freeZone.height,
    centerY: finalBox === null ? input.freeZone.centerY : finalBox.rect.centerY,
    clamped,
  };
}
