import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';

/** Routes reachable without a session. Everything else is behind the gate. */
export const PUBLIC_ROUTES: readonly string[] = ['sign-in', 'sign-up'];

/**
 * In-app QR confirm after the camera scanner. Not a public deep-link landing:
 * custom-scheme login URLs are dropped in +native-intent.
 */
export const QR_CONFIRM_ROUTE = 'qr-confirm';

export function isPublicRoute(segment: string | undefined): boolean {
  return segment !== undefined && PUBLIC_ROUTES.includes(segment);
}

export type RedirectTarget = '/sign-in' | '/' | null;

/**
 * Where the router should go, given who the user is and where they are.
 *
 * Pure so the rule is testable without a navigator: `null` means "stay put".
 */
export function authRedirectTarget(
  status: 'restoring' | 'authenticated' | 'anonymous',
  firstSegment: string | undefined,
): RedirectTarget {
  if (status === 'restoring') {
    return null;
  }

  if (firstSegment === QR_CONFIRM_ROUTE) {
    return null;
  }

  const onPublicRoute = isPublicRoute(firstSegment);

  if (status === 'anonymous') {
    return onPublicRoute ? null : '/sign-in';
  }

  return onPublicRoute ? '/' : null;
}

/**
 * The single auth gate for the app.
 *
 * Mounted once in the root layout, so no screen has to remember to check for a
 * session. Waits for bootstrap: redirecting while the session is still being
 * restored would flash the sign-in screen at every cold start.
 */
export function useAuthRedirect(isReady: boolean): void {
  const router = useRouter();
  const segments = useSegments();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const target = authRedirectTarget(status, segments[0]);

    if (target !== null) {
      router.replace(target);
    }
  }, [isReady, router, segments, status]);
}
