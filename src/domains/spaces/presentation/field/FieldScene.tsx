import type { ReactElement } from 'react';

import { SceneAtmosphere } from '@/scene/effects/SceneAtmosphere';
import { SceneLighting } from '@/scene/lighting/SceneLighting';
import { FpsMeter } from '@/scene/systems/FpsMeter';

import { BridgeSurface } from './BridgeSurface';
import { FieldCameraRig } from './FieldCameraRig';
import type { FieldSpritePlacement } from './FieldObjectLayer';
import { FieldSprites } from './FieldSprites';
import { visibleBridgeRows } from './fieldLayout';

type FieldSceneProps = {
  readonly maxRow: number;
  readonly sprites: readonly FieldSpritePlacement[];
};

/**
 * Bridge field in one R3F canvas.
 * Platform width tapers via base/end compression; sprites stay full size on cell centers.
 * (BridgeSurface reads compression from the field camera store.)
 */
export function FieldScene({ maxRow, sprites }: FieldSceneProps): ReactElement {
  const spanRows = visibleBridgeRows(maxRow);
  return (
    <>
      <FieldCameraRig />
      <FpsMeter />
      <SceneAtmosphere />
      <SceneLighting />
      <BridgeSurface maxRow={maxRow} />
      <FieldSprites sprites={sprites} spanRows={spanRows} />
    </>
  );
}
