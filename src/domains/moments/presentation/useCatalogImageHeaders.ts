import { useEffect, useState } from 'react';

import { useServices } from '@/app/providers/ContainerProvider';

import type { ImageHeaders } from './spritePlayback';

/** Bearer token for sheet, preview, and project avatar bytes. Never put it in the URL. */
export function useCatalogImageHeaders(): ImageHeaders {
  const sessions = useServices().sessions;
  const [headers, setHeaders] = useState<ImageHeaders>(null);

  useEffect(() => {
    let cancelled = false;
    void sessions
      .token()
      .then((token) => {
        if (cancelled || token === null || token.length === 0) return;
        setHeaders({ Authorization: `Bearer ${token}` });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessions]);

  return headers;
}
