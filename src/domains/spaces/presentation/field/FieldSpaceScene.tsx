import type { ReactElement } from 'react';

import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import type { SurfaceObject } from '@/domains/spaces/domain/entities/SurfaceObject';

import { FieldGridSurface } from './FieldGridSurface';
import { FieldSurfaceObjects } from './FieldSurfaceObjects';
import { FieldWorldAxes } from './FieldWorldAxes';
import { useFieldConfig, useFieldGridConfig } from './useFieldConfig';

/** Static 3D field content: numbered grid surface + optional world axes gizmo. */
export function FieldSpaceScene({
  objects,
  headers,
}: {
  readonly objects: readonly SurfaceObject[];
  readonly headers: AuthenticatedAssetHeaders;
}): ReactElement {
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
      <FieldSurfaceObjects config={gridConfig} headers={headers} objects={objects} />
      {showWorldAxes ? <FieldWorldAxes /> : null}
    </>
  );
}
