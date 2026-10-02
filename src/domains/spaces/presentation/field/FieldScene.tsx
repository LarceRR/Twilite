import type { ReactElement } from 'react';

import { SceneAtmosphere } from '@/scene/effects/SceneAtmosphere';
import { SceneLighting } from '@/scene/lighting/SceneLighting';
import { FpsMeter } from '@/scene/systems/FpsMeter';

import { BridgeSurface } from './BridgeSurface';
import { FIELD_FOG } from './fieldCamera';

type FieldSceneProps = {
  readonly maxRow: number;
};

/** Bridge field platform in R3F. Sprites are a separate GL overlay for crisp pixels. */
export function FieldScene({ maxRow }: FieldSceneProps): ReactElement {
  return (
    <>
      <FpsMeter />
      <SceneAtmosphere fixedFog={FIELD_FOG} />
      <SceneLighting />
      <BridgeSurface maxRow={maxRow} />
    </>
  );
}
