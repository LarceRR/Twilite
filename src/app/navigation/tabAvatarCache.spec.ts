import { describe, expect, it } from 'vitest';

import {
  circularTabAvatarPath,
  normalizeRemoteAvatarUrl,
  rawTabAvatarPath,
  stripDataUrlBase64,
  tabAvatarCacheDir,
  tabAvatarImageSource,
  tabAvatarLeafName,
  tabAvatarPixelSize,
  TAB_AVATAR_POINT_SIZE,
} from './tabAvatarCache';

describe('tabAvatarCache', () => {
  it('normalizes blank remote urls to empty', () => {
    expect(normalizeRemoteAvatarUrl(null)).toBe('');
    expect(normalizeRemoteAvatarUrl('  ')).toBe('');
    expect(normalizeRemoteAvatarUrl(' https://cdn.example/a.png ')).toBe(
      'https://cdn.example/a.png',
    );
  });

  it('builds cache paths for raw and circular files', () => {
    expect(tabAvatarCacheDir(null)).toBeNull();
    expect(tabAvatarCacheDir('')).toBeNull();
    expect(tabAvatarCacheDir('file:///cache/')).toBe('file:///cache/tab-avatars/');

    expect(tabAvatarLeafName('https://cdn.example/u/photo.png?x=1')).toBe('photo.png');
    expect(tabAvatarLeafName('https://cdn.example/')).toBe('avatar');

    const dir = 'file:///cache/tab-avatars/';
    expect(rawTabAvatarPath(dir, 'photo.png')).toBe('file:///cache/tab-avatars/photo.png');
    expect(circularTabAvatarPath(dir, 'photo.png', 3)).toBe(
      `file:///cache/tab-avatars/photo.png.circle.${TAB_AVATAR_POINT_SIZE}@${26 * 3}.png`,
    );
  });

  it('rasters at point size times screen scale', () => {
    expect(TAB_AVATAR_POINT_SIZE).toBe(26);
    expect(tabAvatarPixelSize(2)).toBe(52);
    expect(tabAvatarPixelSize(3)).toBe(78);
  });

  it('declares a point-sized image source with retina scale for the tab bar', () => {
    expect(tabAvatarImageSource('file:///a.png', 3)).toEqual({
      uri: 'file:///a.png',
      width: TAB_AVATAR_POINT_SIZE,
      height: TAB_AVATAR_POINT_SIZE,
      scale: 3,
    });
  });

  it('strips data-url prefixes from svg exports', () => {
    expect(stripDataUrlBase64('abc')).toBe('abc');
    expect(stripDataUrlBase64('data:image/png;base64,abc')).toBe('abc');
  });
});
