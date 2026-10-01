import { describe, expect, it } from 'vitest';

import { UnauthorizedError } from '@/shared/errors';

import { toAuthSession } from './authMapper';

describe('toAuthSession', () => {
  it('rejects a web-style session without tokens', () => {
    expect(() =>
      toAuthSession({
        userId: '11111111-1111-4111-8111-111111111111',
        expiresAt: new Date().toISOString(),
      }),
    ).toThrow(UnauthorizedError);
  });

  it('keeps mobile tokens', () => {
    const session = toAuthSession({
      userId: '11111111-1111-4111-8111-111111111111',
      expiresAt: '2026-01-01T00:00:00.000Z',
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    expect(session.accessToken).toBe('access');
    expect(session.refreshToken).toBe('refresh');
  });
});
