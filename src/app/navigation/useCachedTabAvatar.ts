import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';
import { PixelRatio, type ImageURISource } from 'react-native';

import {
  circularTabAvatarPath,
  normalizeRemoteAvatarUrl,
  rawTabAvatarPath,
  tabAvatarCacheDir,
  tabAvatarImageSource,
  tabAvatarLeafName,
} from './tabAvatarCache';

export type TabAvatarBakeRequest = {
  readonly sourceUri: string;
  readonly destUri: string;
  readonly scale: number;
};

export type CachedTabAvatar = {
  /** Circular local PNG when ready; null keeps the profile glyph until then. */
  readonly source: ImageURISource | null;
  readonly bake: TabAvatarBakeRequest | null;
  readonly onBakeReady: (destUri: string) => void;
  readonly onBakeError: () => void;
};

async function ensureCacheDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * NativeTabs on iOS prefers a local image for `src`. Remote URIs often become a
 * black template square, and even a perfect PNG is still drawn as a square —
 * UITabBarItem has no borderRadius. We cache the CDN file, then bake a circular
 * PNG (transparent corners) at TAB_AVATAR_POINT_SIZE × screen scale before
 * handing it to the tab.
 */
export function useCachedTabAvatar(remoteUrl: string | null): CachedTabAvatar {
  const [source, setSource] = useState<ImageURISource | null>(null);
  const [bake, setBake] = useState<TabAvatarBakeRequest | null>(null);
  const scale = PixelRatio.get();

  useEffect(() => {
    let cancelled = false;
    const uri = normalizeRemoteAvatarUrl(remoteUrl);
    setSource(null);
    setBake(null);

    if (uri.length === 0) {
      return;
    }

    void (async () => {
      try {
        const dir = tabAvatarCacheDir(FileSystem.cacheDirectory);
        if (dir === null) {
          return;
        }

        await ensureCacheDir(dir);

        const leaf = tabAvatarLeafName(uri);
        const rawPath = rawTabAvatarPath(dir, leaf);
        const circlePath = circularTabAvatarPath(dir, leaf, scale);

        const circleInfo = await FileSystem.getInfoAsync(circlePath);
        if (circleInfo.exists) {
          if (!cancelled) {
            setSource(tabAvatarImageSource(circlePath, scale));
          }
          return;
        }

        const rawInfo = await FileSystem.getInfoAsync(rawPath);
        if (!rawInfo.exists) {
          await FileSystem.downloadAsync(uri, rawPath);
        }

        if (!cancelled) {
          setBake({ sourceUri: rawPath, destUri: circlePath, scale });
        }
      } catch {
        // Keep glyph fallback — never show a raw square photo in the tab bar.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [remoteUrl, scale]);

  const onBakeReady = useCallback(
    (destUri: string) => {
      setBake(null);
      setSource(tabAvatarImageSource(destUri, scale));
    },
    [scale],
  );

  const onBakeError = useCallback(() => {
    setBake(null);
  }, []);

  return { source, bake, onBakeReady, onBakeError };
}
