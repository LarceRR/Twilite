import { describe, expect, it } from 'vitest';

import { authRedirectTarget, isPublicRoute } from './useAuthRedirect';

describe('authRedirectTarget', () => {
  it('waits while the session is still being restored', () => {
    expect(authRedirectTarget('restoring', '(tabs)')).toBeNull();
    expect(authRedirectTarget('restoring', 'sign-in')).toBeNull();
  });

  it('sends anonymous users to sign-in from any protected route', () => {
    expect(authRedirectTarget('anonymous', '(tabs)')).toBe('/sign-in');
    expect(authRedirectTarget('anonymous', 'settings')).toBe('/sign-in');
    expect(authRedirectTarget('anonymous', 'devices')).toBe('/sign-in');
    expect(authRedirectTarget('anonymous', 'billing')).toBe('/sign-in');
    expect(authRedirectTarget('anonymous', undefined)).toBe('/sign-in');
  });

  it('leaves anonymous users alone on the auth routes', () => {
    expect(authRedirectTarget('anonymous', 'sign-in')).toBeNull();
    expect(authRedirectTarget('anonymous', 'sign-up')).toBeNull();
  });

  it('bounces authenticated users off the auth routes', () => {
    expect(authRedirectTarget('authenticated', 'sign-in')).toBe('/');
    expect(authRedirectTarget('authenticated', 'sign-up')).toBe('/');
  });

  it('leaves both anonymous and authenticated users on the QR confirm screen', () => {
    expect(authRedirectTarget('anonymous', 'qr-confirm')).toBeNull();
    expect(authRedirectTarget('authenticated', 'qr-confirm')).toBeNull();
  });

  it('leaves authenticated users where they are', () => {
    expect(authRedirectTarget('authenticated', '(tabs)')).toBeNull();
    expect(authRedirectTarget('authenticated', 'settings')).toBeNull();
  });
});

describe('isPublicRoute', () => {
  it('knows the two public entry points', () => {
    expect(isPublicRoute('sign-in')).toBe(true);
    expect(isPublicRoute('sign-up')).toBe(true);
    expect(isPublicRoute('login')).toBe(false);
    expect(isPublicRoute('qr-confirm')).toBe(false);
    expect(isPublicRoute('(tabs)')).toBe(false);
    expect(isPublicRoute(undefined)).toBe(false);
  });
});
