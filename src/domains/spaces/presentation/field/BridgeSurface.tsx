import { memo, type ReactElement, useEffect, useMemo } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  DataTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';

import { useThemeColors } from '@/design-system/colors/colors';

import { BRIDGE_COLUMN_COUNT } from '@/domains/surfaces/domain/services/spawnBridgeRow';

import { buildTaperedBridgeDeck } from './bridgeDeckGeometry';
import {
  selectSurfaceBaseCompression,
  selectSurfaceEndCompression,
  useFieldCameraStore,
} from './fieldCameraStore';
import { FIELD_PLATFORM_Y, visibleBridgeRows } from './fieldLayout';
import { ViewportCellHighlight } from './ViewportCellHighlight';

type BridgeSurfaceProps = {
  readonly maxRow: number;
};

function hexToRgb(hex: string): readonly [number, number, number] {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => `${c}${c}`)
          .join('')
      : normalized;
  const value = Number.parseInt(full.slice(0, 6), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function createCheckerTexture(evenHex: string, oddHex: string, rows: number): DataTexture {
  const width = BRIDGE_COLUMN_COUNT;
  const height = Math.max(1, rows);
  const data = new Uint8Array(width * height * 4);
  const even = hexToRgb(evenHex);
  const odd = hexToRgb(oddHex);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tone = (x + y) % 2 === 0 ? even : odd;
      const i = (y * width + x) * 4;
      data[i] = tone[0];
      data[i + 1] = tone[1];
      data[i + 2] = tone[2];
      data[i + 3] = 210;
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Tapered deck: one quad per cell so checker edges stay on the taper
 * instead of kinking into arrows along a row-wide triangle diagonal.
 */
function BridgeSurfaceComponent({ maxRow }: BridgeSurfaceProps): ReactElement {
  const theme = useThemeColors();
  const baseCompression = useFieldCameraStore(selectSurfaceBaseCompression);
  const endCompression = useFieldCameraStore(selectSurfaceEndCompression);
  const visibleRows = visibleBridgeRows(maxRow);

  const mesh = useMemo(() => {
    const deck = buildTaperedBridgeDeck(baseCompression, endCompression, visibleRows);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(deck.positions, 3));
    geometry.setAttribute('uv', new BufferAttribute(deck.uvs, 2));
    geometry.setIndex(new BufferAttribute(deck.indices, 1));
    geometry.computeVertexNormals();

    const map = createCheckerTexture(theme.surfaceRaised, theme.surfaceSunken, deck.rowCount);
    const material = new MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
      fog: false,
    });

    const surface = new Mesh(geometry, material);
    surface.frustumCulled = false;
    surface.renderOrder = 0;
    return surface;
  }, [baseCompression, endCompression, theme.surfaceRaised, theme.surfaceSunken, visibleRows]);

  useEffect(() => {
    return () => {
      mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        for (const entry of material) {
          entry.map?.dispose();
          entry.dispose();
        }
      } else {
        material.map?.dispose();
        material.dispose();
      }
    };
  }, [mesh]);

  return (
    <group position={[0, FIELD_PLATFORM_Y, 0]}>
      <primitive object={mesh} />
      <ViewportCellHighlight
        rowCount={visibleRows}
        baseCompression={baseCompression}
        endCompression={endCompression}
      />
    </group>
  );
}

export const BridgeSurface = memo(BridgeSurfaceComponent);
