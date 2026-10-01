import { Asset } from 'expo-asset';
import { Image as RNImage } from 'react-native';
import {
  ClampToEdgeWrapping,
  NearestFilter,
  Texture,
} from 'three';

const cache = new Map<string, Promise<Texture>>();

async function ensureAssetSize(asset: Asset): Promise<void> {
  if (asset.width > 0 && asset.height > 0) {
    return;
  }
  const uri = asset.localUri ?? asset.uri;
  if (uri == null || uri.length === 0) {
    throw new Error('Sheet asset has no URI');
  }
  const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    RNImage.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
  asset.width = dims.width;
  asset.height = dims.height;
}

/**
 * RN/Expo texture load for Three.js (SDK 53+/three 0.17x).
 *
 * Critical: mark `isDataTexture` so WebGLTextures uploads via
 * `texImage2D(..., width, height, ..., data)` — expo-gl native accepts Asset
 * as `data`. Plain TextureLoader / DOM Image does not exist on RN.
 * @see https://github.com/Expo/expo-three/issues/319
 */
export function loadRemoteTexture(url: string): Promise<Texture> {
  const existing = cache.get(url);
  if (existing !== undefined) {
    return existing;
  }

  const promise = (async () => {
    try {
      const asset = Asset.fromURI(url);
      await asset.downloadAsync();
      await ensureAssetSize(asset);

      const texture = new Texture();
      // Force DataTexture upload path — load-bearing for expo-gl + modern three.
      (texture as unknown as { isDataTexture: boolean }).isDataTexture = true;
      texture.image = {
        data: asset,
        width: asset.width,
        height: asset.height,
      } as unknown as Texture['image'];
      texture.magFilter = NearestFilter;
      texture.minFilter = NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = ClampToEdgeWrapping;
      texture.wrapT = ClampToEdgeWrapping;
      texture.flipY = true;
      texture.needsUpdate = true;
      return texture;
    } catch (error) {
      cache.delete(url);
      throw error;
    }
  })();

  cache.set(url, promise);
  return promise;
}

/** Per-sprite UV state; shares the decoded Asset image with the cached base. */
export function cloneSheetTexture(base: Texture): Texture {
  const texture = base.clone();
  (texture as unknown as { isDataTexture: boolean }).isDataTexture = true;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = base.flipY;
  texture.needsUpdate = true;
  return texture;
}
