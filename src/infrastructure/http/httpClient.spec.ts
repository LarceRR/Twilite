import { describe, expect, it, vi } from 'vitest';

import { createHttpClient } from './httpClient';

describe('createHttpClient', () => {
  it('does not resolve tokens for public auth endpoints', async () => {
    const token = vi.fn(async () => 'should-not-be-used');
    const invalidate = vi.fn(async () => null);
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const http = createHttpClient({
      baseUrl: 'http://example.test/v1',
      tokens: { token, invalidate },
      logger: {
        child: () => ({
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
        }),
      } as never,
    });

    await http.post('auth/sign-in', { email: 'a@b.c', password: 'x' });
    await http.post('auth/refresh', { refreshToken: 'r' });
    await http.post('auth/sign-up', {
      email: 'a@b.c',
      password: 'x',
      displayName: 'A',
    });

    expect(token).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    }

    vi.unstubAllGlobals();
  });

  it('attaches bearer token for authenticated endpoints', async () => {
    const token = vi.fn(async () => 'access-token');
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ id: '1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const http = createHttpClient({
      baseUrl: 'http://example.test/v1',
      tokens: { token, invalidate: vi.fn(async () => null) },
      logger: {
        child: () => ({
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
        }),
      } as never,
    });

    await http.get('users/me');

    expect(token).toHaveBeenCalledOnce();
    const firstCall = fetchMock.mock.calls[0];
    if (firstCall === undefined || firstCall[1] === undefined) {
      throw new Error('Expected authenticated fetch call');
    }
    const headers = firstCall[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer access-token');

    vi.unstubAllGlobals();
  });

  it('sends a validated idempotency key with authenticated POST requests', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ id: 'object-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const http = createHttpClient({
      baseUrl: 'http://example.test/v1',
      tokens: { token: vi.fn(async () => 'access-token'), invalidate: vi.fn(async () => null) },
      logger: {
        child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
      } as never,
    });

    await http.post(
      'spaces/space-1/surface-objects',
      { kind: 'Fire', pixelObjectId: 'pixel-1' },
      { idempotencyKey: 'surface_operation-1' },
    );

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('surface_operation-1');
    expect(headers.Authorization).toBe('Bearer access-token');
    vi.unstubAllGlobals();
  });
});
