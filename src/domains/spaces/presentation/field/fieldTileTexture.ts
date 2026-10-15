import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import {
  ClampToEdgeWrapping,
  DataTexture,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
} from 'three';

import { useFieldTileStore } from './fieldTileStore';

const STORAGE_KEY = 'twilite.field-tile-texture.v1';

type CachedTexture = { promise: Promise<Texture>; references: number };
const cache = new Map<string, CachedTexture>();
let hydration: Promise<void> | null = null;

/** Restores the selected app-local URI; the image itself stays as a normal file. */
export function hydrateFieldTileTextureUri(): Promise<void> {
  if (hydration !== null) return hydration;
  hydration = AsyncStorage.getItem(STORAGE_KEY)
    .then((uri) => {
      if (uri !== null && uri.trim().length > 0) {
        useFieldTileStore.getState().setTextureUri(uri);
      }
    })
    .catch((error: unknown) => {
      hydration = null;
      console.warn('Unable to restore tile texture URI', error);
    });
  return hydration;
}

export async function persistFieldTileTextureUri(uri: string | null): Promise<void> {
  if (uri === null) {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } else {
    await AsyncStorage.setItem(STORAGE_KEY, uri);
  }
  useFieldTileStore.getState().setTextureUri(uri);
}

export function createSolidTileTexture(hex: string): DataTexture {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((character) => character + character).join('') : raw;
  const value = Number.parseInt(full, 16);
  const texture = new DataTexture(
    new Uint8Array([(value >> 16) & 255, (value >> 8) & 255, value & 255, 255]),
    1,
    1,
    RGBAFormat,
  );
  // Tiles are now physically lit: albedo must be decoded from sRGB to linear.
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Reference-counted so all streamed chunks can use the same decoded image while
 * a previous URI is safely released after the last chunk switches away.
 */
export async function acquireFieldTileTexture(
  uri: string,
): Promise<{ readonly texture: Texture; readonly release: () => void }> {
  let entry = cache.get(uri);
  if (entry === undefined) {
    entry = { promise: loadTexture(uri), references: 0 };
    cache.set(uri, entry);
  }
  entry.references += 1;

  let texture: Texture;
  try {
    texture = await entry.promise;
  } catch (error) {
    entry.references -= 1;
    if (entry.references <= 0) cache.delete(uri);
    throw error;
  }

  let released = false;
  return {
    texture,
    release: () => {
      if (released) return;
      released = true;
      entry!.references -= 1;
      if (entry!.references <= 0) {
        texture.dispose();
        if (cache.get(uri) === entry) cache.delete(uri);
      }
    },
  };
}

async function loadTexture(uri: string): Promise<Texture> {
  const asset = Asset.fromURI(uri);
  await asset.downloadAsync();
  const imageUri = asset.localUri ?? uri;
  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(imageUri, (width, height) => resolve({ width, height }), reject);
  });
  if (dimensions.width < 1 || dimensions.height < 1) {
    throw new Error('Selected tile texture has invalid dimensions');
  }

  // Expo GL can upload the downloaded native Asset directly as a texture source.
  const image = Object.assign(asset, dimensions);
  const texture = new Texture(image as unknown as Texture['image']);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
