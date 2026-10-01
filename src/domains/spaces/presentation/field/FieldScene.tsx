import type { ReactElement } from 'react';

import { SceneAtmosphere } from '@/scene/effects/SceneAtmosphere';
import { SceneLighting } from '@/scene/lighting/SceneLighting';
import { FpsMeter } from '@/scene/systems/FpsMeter';

import { BridgeSurface } from './BridgeSurface';

type FieldSceneProps = {
  readonly maxRow: number;
};

/** Bridge field platform in R3F. Sprites are a 2D overlay (RN Image) for reliability on iOS. */
export function FieldScene({ maxRow }: FieldSceneProps): ReactElement {
  return (
    <>
      <FpsMeter />
      <SceneAtmosphere />
      <SceneLighting />
      <BridgeSurface maxRow={maxRow} />
    </>
  );
}
