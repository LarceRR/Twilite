import { Asset } from 'expo-asset';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import {
  ClampToEdgeWrapping,
  DoubleSide,
  NearestFilter,
  SRGBColorSpace,
  Texture,
} from 'three';

import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import { cachedImageFile } from '@/infrastructure/assets/cachedImageFile';
import type { PixelObjectMobileDto } from '@/shared/contracts';

export function FieldSurfaceObjectArtwork({
  sprite,
  headers,
  height,
  onTextureReady,
}: {
  readonly sprite: PixelObjectMobileDto | null;
  readonly headers: AuthenticatedAssetHeaders;
  readonly height: number;
  readonly onTextureReady: (texture: Texture | null) => void;
}): ReactElement | null {
  const uri = useCachedSpriteUri(sprite?.sheetUrl ?? null, headers);
  if (sprite === null || uri === null) return null;

  return (
    <LoadedArtwork
      height={height}
      onTextureReady={onTextureReady}
      sprite={sprite}
      uri={uri}
    />
  );
}

/**
 * expo-gl does not provide a DOM Image element for Three's browser TextureLoader.
 * Pass an Expo Asset directly to the native GL texture upload path instead.
 */
function LoadedArtwork({
  sprite,
  uri,
  height,
  onTextureReady,
}: {
  readonly sprite: PixelObjectMobileDto;
  readonly uri: string;
  readonly height: number;
  readonly onTextureReady: (texture: Texture | null) => void;
}): ReactElement | null {
  const [texture, setTexture] = useState<Texture | null>(null);
  const width = height * (sprite.canvas.width / sprite.canvas.height);

  useEffect(() => {
    let active = true;
    let ownedTexture: Texture | null = null;

    const load = async (): Promise<void> => {
      const asset = Asset.fromURI(uri);
      await asset.downloadAsync();

      // expo-gl's texImage2D accepts an Expo Asset as a native image source.
      // Three's native renderer forwards Texture.image to expo-gl's patched
      // texImage2D. Keep the downloaded Asset as the image source (not a DOM
      // Image); explicitly provide dimensions because file-backed Assets may
      // otherwise report 0×0 before the native upload occurs.
      const image = Object.assign(asset, {
        width: sprite.sheet.width,
        height: sprite.sheet.height,
      });
      const nextTexture = new Texture(image as unknown as Texture['image']);
      configureTexture(nextTexture);
      nextTexture.needsUpdate = true;

      if (!active) {
        nextTexture.dispose();
        return;
      }

      ownedTexture = nextTexture;
      setTexture(nextTexture);
      onTextureReady(nextTexture);
    };

    void load().catch(() => {
      if (active) onTextureReady(null);
    });

    return () => {
      active = false;
      onTextureReady(null);
      if (ownedTexture !== null) {
        ownedTexture.dispose();
        ownedTexture = null;
      }
    };
  }, [onTextureReady, uri]);

  if (texture === null) return null;

  return (
    <mesh rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[height, width]} />
      <meshBasicMaterial
        alphaTest={0.02}
        map={texture}
        side={DoubleSide}
        transparent
        toneMapped={false}
      />
    </mesh>
  );
}

function configureTexture(texture: Texture): void {
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
}

function useCachedSpriteUri(
  sheetUrl: string | null,
  headers: AuthenticatedAssetHeaders,
): string | null {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUri(null);
    if (sheetUrl === null || headers === null) {
      return () => {
        active = false;
      };
    }

    void loadCachedSprite(sheetUrl, headers)
      .then((fileUri) => {
        if (active) setUri(fileUri);
      })
      .catch(() => {
        if (active) setUri(null);
      });

    return () => {
      active = false;
    };
  }, [headers, sheetUrl]);
  return uri;
}

async function loadCachedSprite(
  sheetUrl: string,
  headers: Readonly<Record<string, string>>,
): Promise<string> {
  const fileUri = await cachedImageFile(sheetUrl, headers);
  const asset = Asset.fromURI(fileUri);
  await asset.downloadAsync();
  return asset.localUri ?? fileUri;
}
