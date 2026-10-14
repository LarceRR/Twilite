import { useEffect, useState } from 'react';

import { useServices } from '@/app/providers/ContainerProvider';

export type AuthenticatedAssetHeaders = Readonly<Record<string, string>> | null;

export function useAuthenticatedAssetHeaders(): AuthenticatedAssetHeaders {
  const sessions = useServices().sessions;
  const [headers, setHeaders] = useState<AuthenticatedAssetHeaders>(null);

  useEffect(() => {
    let cancelled = false;
    void sessions
      .token()
      .then((token) => {
        if (!cancelled && token !== null && token.length > 0) {
          setHeaders({ Authorization: `Bearer ${token}` });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessions]);

  return headers;
}