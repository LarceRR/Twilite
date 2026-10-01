import { describe, expect, it, vi } from 'vitest';

import { createHttpClient } from './httpClient';

describe('createHttpClient', () => {
  it('does not resolve tokens for public auth endpoints', async () => {
    const token = vi.fn(async () => 'should-not-be-used');
    const invalidate = vi.fn(async () => null);
    const fetchMock = vi.fn(async () =>
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
    const fetchMock = vi.fn(async () =>
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
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe('Bearer access-token');

    vi.unstubAllGlobals();
  });
});
