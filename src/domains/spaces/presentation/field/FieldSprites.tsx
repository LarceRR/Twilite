import { memo, type ReactElement } from 'react';

import type { FieldSpritePlacement } from './FieldObjectLayer';
import { FieldSpriteBillboard } from './FieldSpriteBillboard';

type FieldSpritesProps = {
  readonly sprites: readonly FieldSpritePlacement[];
};

/** All field pixel objects in the shared R3F canvas (one WebGL context). */
function FieldSpritesComponent({ sprites }: FieldSpritesProps): ReactElement {
  return (
    <group>
      {sprites.map((sprite) => (
        <FieldSpriteBillboard
          key={sprite.surfaceObjectId}
          surfaceObjectId={sprite.surfaceObjectId}
          cell={sprite.cell}
          dto={sprite.dto}
        />
      ))}
    </group>
  );
}

export const FieldSprites = memo(FieldSpritesComponent);
