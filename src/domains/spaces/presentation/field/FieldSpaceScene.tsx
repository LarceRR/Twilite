import type { ReactElement } from 'react';

import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import { FieldGridSurface } from './FieldGridSurface';
import { FieldWorldAxes } from './FieldWorldAxes';
import { useFieldConfig, useFieldGridConfig } from './useFieldConfig';

/** Static 3D field content: numbered grid surface + optional world axes gizmo. */
export function FieldSpaceScene(): ReactElement {
  const showWorldAxes = useSettingsStore((s) => s.developerShowWorldAxes);
  const fieldConfig = useFieldConfig();
  const gridConfig = useFieldGridConfig();
  const { lighting } = fieldConfig;

  return (
    <>
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight
        position={[...lighting.directionalPosition]}
        intensity={lighting.directionalIntensity}
      />
      <FieldGridSurface config={gridConfig} />
      {showWorldAxes ? <FieldWorldAxes /> : null}
    </>
  );
}
