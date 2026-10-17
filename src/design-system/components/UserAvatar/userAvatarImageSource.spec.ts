import { describe, expect, it } from 'vitest';

import { userAvatarImageSource } from './userAvatarImageSource';

describe('userAvatarImageSource', () => {
  it('waits for auth headers before requesting a protected remote avatar', () => {
    expect(userAvatarImageSource(' https://assets.example/avatar.png ', null)).toBeNull();
  });

  it('keeps legacy public avatar sources working when no auth prop is supplied', () => {
    expect(userAvatarImageSource('https://assets.example/public-avatar.png', undefined)).toEqual({
      uri: 'https://assets.example/public-avatar.png',
    });
  });

  it('adds session headers to remote avatar requests', () => {
    expect(
      userAvatarImageSource('https://assets.example/avatar.png', {
        Authorization: 'Bearer token',
      }),
    ).toEqual({
      uri: 'https://assets.example/avatar.png',
      headers: { Authorization: 'Bearer token' },
      cache: 'force-cache',
    });
  });

  it('keeps sandbox-local file avatars working without network headers', () => {
    expect(userAvatarImageSource('file:///sandbox/avatar.png', null)).toEqual({
      uri: 'file:///sandbox/avatar.png',
    });
  });

  it('returns null for a blank URL', () => {
    expect(userAvatarImageSource('   ', { Authorization: 'Bearer token' })).toBeNull();
  });
});
