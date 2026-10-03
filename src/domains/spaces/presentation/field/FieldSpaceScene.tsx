import type { ReactElement } from 'react';

import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import { createFieldGridConfig } from './fieldGridConfig';
import { FieldGridSurface } from './FieldGridSurface';
import { FieldWorldAxes } from './FieldWorldAxes';

const GRID_CONFIG = createFieldGridConfig();

/** Static 3D field content: numbered grid surface + optional world axes gizmo. */
export function FieldSpaceScene(): ReactElement {
  const showWorldAxes = useSettingsStore((s) => s.developerShowWorldAxes);

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[240, 420, 180]} intensity={0.55} />
      <FieldGridSurface config={GRID_CONFIG} />
      {showWorldAxes ? <FieldWorldAxes /> : null}
    </>
  );
}
