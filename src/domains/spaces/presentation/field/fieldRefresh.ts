import type { QueryClient } from '@tanstack/react-query';

import { spacing } from '@/design-system/spacing/spacing';
import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { queryKeys } from '@/infrastructure/query/queryKeys';

/** Prefix for sprite `/mobile` queries. Invalidating it refetches every loaded asset. */
export const PIXEL_OBJECT_MOBILE_QUERY_KEY = ['pixel-objects', 'mobile'] as const;

/** Vertical room taken by the camera-mode chip so Refresh sits under it. */
const CAMERA_MODE_BLOCK = 44;

export function fieldRefreshQueryKeys(spaceId: SpaceId | null): readonly (readonly unknown[])[] {
  const keys: (readonly unknown[])[] = [queryKeys.spaces()];
  if (spaceId !== null) {
    keys.push(queryKeys.surface(spaceId));
  }
  keys.push(PIXEL_OBJECT_MOBILE_QUERY_KEY);
  return keys;
}

/** Reloads the space list, the field snapshot, and sprite assets. */
export function refreshFieldAndSpace(
  queryClient: QueryClient,
  spaceId: SpaceId | null,
): Promise<void> {
  const pending = fieldRefreshQueryKeys(spaceId).map((queryKey) =>
    queryClient.invalidateQueries({ queryKey }),
  );
  return Promise.all(pending).then(() => undefined);
}

export function fieldRefreshButtonTop(safeAreaTop: number, cameraControlsVisible: boolean): number {
  const top = safeAreaTop + spacing.sm;
  if (!cameraControlsVisible) {
    return top;
  }
  return top + CAMERA_MODE_BLOCK + spacing.xs;
}
