import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactElement, type ReactNode } from 'react';
import {
  Color,
  DoubleSide,
  FrontSide,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  Vector2,
} from 'three';

import {
  type FieldMaterialMapKey,
  type FieldMaterialPreferences,
  useFieldMaterialStore,
} from './fieldMaterialStore';

export type LoadedFieldTextures = Partial<Record<FieldMaterialMapKey, Texture>>;

type FieldMaterialContextValue = {
  readonly textures: LoadedFieldTextures;
  readonly loading: boolean;
  readonly error: string | null;
};

const FieldMaterialContext = createContext<FieldMaterialContextValue>({
  textures: {},
  loading: false,
  error: null,
});

const MAP_KEYS: readonly FieldMaterialMapKey[] = [
  'color',
  'normal',
  'roughness',
  'metalness',
  'ao',
  'bump',
  'displacement',
  'emissive',
];

export function FieldSceneMaterialProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const maps = useFieldMaterialStore((state) => state.maps);
  const anisotropy = useFieldMaterialStore((state) => state.anisotropy);
  const [textures, setTextures] = useState<LoadedFieldTextures>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapSignature = MAP_KEYS.map((key) => maps[key] ?? '').join('|');
  const mapUris = mapSignature.split('|');

  useEffect(() => {
    let cancelled = false;
    const owned: LoadedFieldTextures = {};
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        setTextures({});
        for (let index = 0; index < MAP_KEYS.length; index += 1) {
          const key = MAP_KEYS[index];
          const uri = mapUris[index];
          if (key === undefined || uri === undefined || uri.length === 0) continue;
          const asset = Asset.fromURI(uri);
          await asset.downloadAsync();
          if (cancelled) return;
          const imageUri = asset.localUri ?? uri;
          const dimensions = await getNativeImageDimensions(imageUri);
          if (cancelled) return;
          const image = Object.assign(asset, {
            width: dimensions.width,
            height: dimensions.height,
          });
          const texture = new Texture(image as unknown as Texture['image']);
          configureFieldTexture(texture, key, 1);
          texture.needsUpdate = true;
          owned[key] = texture;
        }
        if (!cancelled) setTextures(owned);
      } catch (cause) {
        for (const texture of Object.values(owned)) texture?.dispose();
        if (!cancelled) {
          setTextures({});
          setError(cause instanceof Error ? cause.message : 'Не удалось загрузить текстуры');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      for (const texture of Object.values(owned)) texture?.dispose();
    };
  }, [mapSignature]);

  useLayoutEffect(() => {
    for (const texture of Object.values(textures)) {
      if (texture !== undefined && texture.anisotropy !== anisotropy) {
        texture.anisotropy = Math.max(1, Math.min(16, anisotropy));
        texture.needsUpdate = true;
      }
    }
  }, [textures, anisotropy]);

  return (
    <FieldMaterialContext.Provider value={{ textures, loading, error }}>
      {children}
    </FieldMaterialContext.Provider>
  );
}

export function useFieldSceneMaterial(): FieldMaterialContextValue {
  return useContext(FieldMaterialContext);
}

function getNativeImageDimensions(uri: string): Promise<{ readonly width: number; readonly height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(new Error('Не удалось прочитать размеры карты текстуры: ' + error.message)),
    );
  });
}

export function configureFieldTexture(
  texture: Texture,
  key: FieldMaterialMapKey,
  anisotropy: number,
): void {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  texture.center.set(0, 0);
  texture.rotation = 0;
  texture.anisotropy = Math.max(1, Math.min(16, anisotropy));
  texture.colorSpace = key === 'color' || key === 'emissive' ? SRGBColorSpace : NoColorSpace;
  texture.needsUpdate = true;
}

type TwiliteUniforms = {
  readonly uTwiliteCellSize: { value: number };
  readonly uTwiliteTilingScale: { value: Vector2 };
  readonly uTwiliteTextureOffset: { value: Vector2 };
  readonly uTwiliteTextureRotation: { value: number };
};

function createUniforms(): TwiliteUniforms {
  return {
    uTwiliteCellSize: { value: 60 },
    uTwiliteTilingScale: { value: new Vector2(0.25, 0.25) },
    uTwiliteTextureOffset: { value: new Vector2(0, 0) },
    uTwiliteTextureRotation: { value: 0 },
  };
}

/** Standard PBR material with world-aligned UVs so tiles and streamed chunks share one continuous texture. */
export function createFieldStandardMaterial(color: string): MeshStandardMaterial {
  const uniforms = createUniforms();
  const material = new MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.04,
  });
  material.userData.twiliteUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_pars_vertex>',
      '#include <uv_pars_vertex>\nuniform float uTwiliteCellSize;\nuniform vec2 uTwiliteTilingScale;\nuniform vec2 uTwiliteTextureOffset;\nuniform float uTwiliteTextureRotation;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      [
        '#include <uv_vertex>',
        'vec4 twiliteWorldPosition = modelMatrix * vec4(position, 1.0);',
        '#ifdef USE_INSTANCING',
        'twiliteWorldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);',
        '#endif',
        'vec3 twiliteWorldNormal = normalize(mat3(modelMatrix) * normal);',
        '#ifdef USE_INSTANCING',
        'twiliteWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);',
        '#endif',
        'vec2 twiliteProjectionUv;',
        'if (abs(twiliteWorldNormal.z) >= abs(twiliteWorldNormal.x) && abs(twiliteWorldNormal.z) >= abs(twiliteWorldNormal.y)) { twiliteProjectionUv = twiliteWorldPosition.xy; } else if (abs(twiliteWorldNormal.x) >= abs(twiliteWorldNormal.y)) { twiliteProjectionUv = twiliteWorldPosition.zy; } else { twiliteProjectionUv = twiliteWorldPosition.xz; }',
        'vec2 twiliteWorldUv = twiliteProjectionUv / max(uTwiliteCellSize, 0.0001);',
        'float twiliteCos = cos(uTwiliteTextureRotation);',
        'float twiliteSin = sin(uTwiliteTextureRotation);',
        'mat2 twiliteRotation = mat2(twiliteCos, -twiliteSin, twiliteSin, twiliteCos);',
        'vec2 transformedTwiliteUv = twiliteRotation * (twiliteWorldUv * uTwiliteTilingScale) + uTwiliteTextureOffset;',
        '#ifdef USE_MAP',
        'vMapUv = transformedTwiliteUv;',
        '#endif',
        '#ifdef USE_NORMALMAP',
        'vNormalMapUv = transformedTwiliteUv;',
        '#endif',
        '#ifdef USE_ROUGHNESSMAP',
        'vRoughnessMapUv = transformedTwiliteUv;',
        '#endif',
        '#ifdef USE_METALNESSMAP',
        'vMetalnessMapUv = transformedTwiliteUv;',
        '#endif',
        '#ifdef USE_AOMAP',
        'vAoMapUv = transformedTwiliteUv;',
        '#endif',
        '#ifdef USE_BUMPMAP',
        'vBumpMapUv = transformedTwiliteUv;',
        '#endif',
        '#ifdef USE_DISPLACEMENTMAP',
        'vDisplacementMapUv = transformedTwiliteUv;',
        '#endif',
        '#ifdef USE_EMISSIVEMAP',
        'vEmissiveMapUv = transformedTwiliteUv;',
        '#endif',
        '#ifdef USE_ALPHAMAP',
        'vAlphaMapUv = transformedTwiliteUv;',
        '#endif',
        '#ifdef USE_LIGHTMAP',
        'vLightMapUv = transformedTwiliteUv;',
        '#endif',
      ].join('\n'),
    );
  };
  material.customProgramCacheKey = () => 'twilite-world-aligned-material-v1';
  return material;
}

export function updateFieldStandardMaterial(
  material: MeshStandardMaterial,
  settings: FieldMaterialPreferences,
  textures: LoadedFieldTextures,
  cellSize: number,
  fallbackColor: string,
  preserveEmissive = false,
): void {
  const oldMaterialFlags = {
    transparent: material.transparent,
    side: material.side,
    flatShading: material.flatShading,
    wireframe: material.wireframe,
    alphaTest: material.alphaTest,
  };
  const oldMaps = [
    material.map,
    material.normalMap,
    material.roughnessMap,
    material.metalnessMap,
    material.aoMap,
    material.bumpMap,
    material.displacementMap,
    material.emissiveMap,
  ];
  const map = settings.useColorMap ? textures.color ?? null : null;
  const normalMap = settings.useNormalMap ? textures.normal ?? null : null;
  const roughnessMap = settings.useRoughnessMap ? textures.roughness ?? null : null;
  const metalnessMap = settings.useMetalnessMap ? textures.metalness ?? null : null;
  const aoMap = settings.useAoMap ? textures.ao ?? null : null;
  const bumpMap = settings.useBumpMap ? textures.bump ?? null : null;
  const displacementMap = settings.useDisplacementMap ? textures.displacement ?? null : null;
  const emissiveMap = settings.useEmissiveMap ? textures.emissive ?? null : null;

  material.map = map;
  material.normalMap = normalMap;
  material.roughnessMap = roughnessMap;
  material.metalnessMap = metalnessMap;
  material.aoMap = aoMap;
  material.bumpMap = bumpMap;
  material.displacementMap = displacementMap;
  material.emissiveMap = emissiveMap;
  material.color.set(map === null ? fallbackColor : settings.tintHex);
  material.roughness = settings.roughness;
  material.metalness = settings.metalness;
  material.normalScale.set(settings.normalScaleX, settings.normalScaleY);
  material.bumpScale = settings.bumpScale;
  material.displacementScale = settings.displacementScale;
  material.displacementBias = settings.displacementBias;
  material.aoMapIntensity = settings.aoMapIntensity;
  if (!preserveEmissive) {
    material.emissive.set(settings.emissiveHex);
    material.emissiveIntensity = settings.emissiveIntensity;
  }
  material.opacity = settings.opacity;
  material.alphaTest = settings.alphaTest;
  material.transparent = settings.transparent || settings.opacity < 1;
  material.depthWrite = !material.transparent;
  material.side = settings.doubleSide ? DoubleSide : FrontSide;
  material.flatShading = settings.flatShading;
  material.wireframe = settings.wireframe;

  const uniformState = material.userData.twiliteUniforms as TwiliteUniforms | undefined;
  if (uniformState !== undefined) {
    uniformState.uTwiliteCellSize.value = Math.max(0.001, cellSize);
    uniformState.uTwiliteTilingScale.value.set(settings.tilingScaleX, settings.tilingScaleY);
    uniformState.uTwiliteTextureOffset.value.set(settings.textureOffsetX, settings.textureOffsetY);
    uniformState.uTwiliteTextureRotation.value = (settings.textureRotationDeg * Math.PI) / 180;
  }

  const newMaps = [
    material.map,
    material.normalMap,
    material.roughnessMap,
    material.metalnessMap,
    material.aoMap,
    material.bumpMap,
    material.displacementMap,
    material.emissiveMap,
  ];
  if (
    oldMaps.some((oldMap, index) => oldMap !== newMaps[index]) ||
    oldMaterialFlags.transparent !== material.transparent ||
    oldMaterialFlags.side !== material.side ||
    oldMaterialFlags.flatShading !== material.flatShading ||
    oldMaterialFlags.wireframe !== material.wireframe ||
    oldMaterialFlags.alphaTest !== material.alphaTest
  ) {
    material.needsUpdate = true;
  }
}

export function ensureFieldGeometryUvChannels<T extends import('three').BufferGeometry>(geometry: T): T {
  const uv = geometry.getAttribute('uv');
  if (uv !== undefined && geometry.getAttribute('uv1') === undefined) {
    geometry.setAttribute('uv1', uv.clone());
  }
  return geometry;
}
