import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';

import { refreshFieldAndSpace } from './fieldRefresh';

export type FieldRefresh = {
  readonly refresh: () => void;
  readonly refreshing: boolean;
};

export function useRefreshFieldAndSpace(spaceId: SpaceId | null): FieldRefresh {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);

  const refresh = useCallback(() => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setRefreshing(true);
    void refreshFieldAndSpace(queryClient, spaceId).finally(() => {
      busy.current = false;
      setRefreshing(false);
    });
  }, [queryClient, spaceId]);

  return { refresh, refreshing };
}
