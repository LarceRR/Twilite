import { useEffect, useState } from 'react';

import { useServices } from '@/app/providers/ContainerProvider';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';

export type AuthenticatedAssetHeaders = Readonly<Record<string, string>> | null;

export function useAuthenticatedAssetHeaders(): AuthenticatedAssetHeaders {
  const sessions = useServices().sessions;
  const accessToken = useAuthStore((state) => state.session?.accessToken ?? null);
  const [headers, setHeaders] = useState<AuthenticatedAssetHeaders>(null);

  useEffect(() => {
    let cancelled = false;
    void sessions
      .token()
      .then((token) => {
        if (cancelled) return;
        setHeaders(token !== null && token.length > 0 ? { Authorization: `Bearer ${token}` } : null);
      })
      .catch(() => {
        if (!cancelled) setHeaders(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sessions, accessToken]);

  return headers;
}