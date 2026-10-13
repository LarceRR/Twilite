import { useLoader } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import type { ReactElement } from 'react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ClampToEdgeWrapping,
  DoubleSide,
  NearestFilter,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
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
    <Suspense fallback={null}>
      <LoadedArtwork height={height} onTextureReady={onTextureReady} sprite={sprite} uri={uri} />
    </Suspense>
  );
}

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
}): ReactElement {
  const source = useLoader(TextureLoader, uri);
  const texture = useMemo(() => configureTexture(source.clone()), [source]);
  const width = height * (sprite.canvas.width / sprite.canvas.height);

  useEffect(() => {
    onTextureReady(texture);
    return () => {
      onTextureReady(null);
      texture.dispose();
    };
  }, [onTextureReady, texture]);

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

function configureTexture(texture: Texture): Texture {
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function useCachedSpriteUri(
  sheetUrl: string | null,
  headers: AuthenticatedAssetHeaders,
): string | null {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUri(null);
    if (sheetUrl === null || headers === null)
      return () => {
        active = false;
      };
    void loadCachedSprite(sheetUrl, headers)
      .then((fileUri) => {
        if (active) setUri(fileUri);
      })
      .catch(() => undefined);
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
