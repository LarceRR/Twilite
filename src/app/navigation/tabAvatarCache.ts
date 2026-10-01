import { PixelRatio, type ImageURISource } from 'react-native';

/**
 * NativeTabs tab-bar avatar size in points. Sibling glyphs use
 * `nativeTabIconSources` ICON_SIZE — keep them close so the bar looks even.
 * UITabBarItem has no borderRadius — the PNG must already be a circle with
 * transparent corners, at retina pixel density.
 */
export const TAB_AVATAR_POINT_SIZE = 26;

export function tabAvatarPixelSize(scale: number = PixelRatio.get()): number {
  return Math.max(1, Math.round(TAB_AVATAR_POINT_SIZE * scale));
}

export function tabAvatarScale(scale: number = PixelRatio.get()): number {
  return scale > 0 ? scale : 1;
}

export function normalizeRemoteAvatarUrl(remoteUrl: string | null | undefined): string {
  return typeof remoteUrl === 'string' ? remoteUrl.trim() : '';
}

/** Cache folder for tab-bar avatars, or null when the FS cache root is missing. */
export function tabAvatarCacheDir(cacheDirectory: string | null | undefined): string | null {
  if (typeof cacheDirectory !== 'string' || cacheDirectory.length === 0) {
    return null;
  }

  return `${cacheDirectory}tab-avatars/`;
}

export function tabAvatarLeafName(remoteUrl: string): string {
  const leaf = remoteUrl.split('/').pop()?.split('?')[0];

  return leaf && leaf.length > 0 ? leaf : 'avatar';
}

export function rawTabAvatarPath(dir: string, leaf: string): string {
  return `${dir}${leaf}`;
}

/**
 * Circular PNG path — includes point size + scale so a bad bake (wrong size)
 * is never reused after we change the metrics.
 */
export function circularTabAvatarPath(
  dir: string,
  leaf: string,
  scale: number = PixelRatio.get(),
): string {
  const px = tabAvatarPixelSize(scale);
  return `${dir}${leaf}.circle.${TAB_AVATAR_POINT_SIZE}@${px}.png`;
}

export function tabAvatarImageSource(
  uri: string,
  scale: number = PixelRatio.get(),
): ImageURISource {
  return {
    uri,
    width: TAB_AVATAR_POINT_SIZE,
    height: TAB_AVATAR_POINT_SIZE,
    scale: tabAvatarScale(scale),
  };
}

/** `Svg.toDataURL` may return raw base64 or a data-URL; normalize for FileSystem. */
export function stripDataUrlBase64(payload: string): string {
  return payload.replace(/^data:image\/\w+;base64,/, '');
}
