// @refresh reset
import { useFrame, useThree } from '@react-three/fiber/native';
import { memo, type ReactElement, useLayoutEffect, useMemo, useRef } from 'react';
import { type Group, type Mesh, NoToneMapping, PlaneGeometry } from 'three';
import { useColorSchemeToken, useSceneSkyColors } from '@/design-system/colors/colors';
import { cameraMotion } from '@/design-system/motion/camera';
import {
  selectSurfaceBackground,
  useSettingsStore,
} from '@/domains/settings/presentation/stores/settingsStore';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import { useCameraStore } from '@/scene/stores/cameraStore';
import { SURFACE_CELL_WORLD_SIZE } from './constants';
import { computeInfiniteGridCells, snapToCellGrid } from './infiniteSpan';
import {
  applyEndpointCellUniforms,
  applyGridSettings,
  applySurfaceFogUniforms,
  applySurfaceThemeUniforms,
  createSurfaceGridMaterial,
} from './surfaceGridMaterial';
import { resolveSurfaceBackground } from './surfaceTheme';
function SurfaceGridComponent(): ReactElement {
  const fillRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const lastSpanRef = useRef(0);
  const gl = useThree((s) => s.gl);
  const viewport = useThree((s) => s.viewport);
  const scheme = useColorSchemeToken();
  const skyStops = useSceneSkyColors();
  const themeHorizon = skyStops[skyStops.length - 1] ?? null;
  const background = resolveSurfaceBackground(
    useSettingsStore(selectSurfaceBackground),
    scheme,
    themeHorizon,
  );
  const material = useMemo(() => createSurfaceGridMaterial(), []);
  useLayoutEffect(() => {
    gl.setClearColor(background, 1);
    gl.toneMapping = NoToneMapping;
    applySurfaceThemeUniforms(material, background);
  }, [gl, background, material]);
  useFrame(() => {
    const { target, distance } = useCameraStore.getState().orbit;
    const { order, byId } = useSurfaceObjectsStore.getState();
    const settings = useSettingsStore.getState();
    const span = computeInfiniteGridCells(distance, viewport.aspect);
    const size = span * SURFACE_CELL_WORLD_SIZE;
    fillRef.current?.position.set(snapToCellGrid(target.x), 0, snapToCellGrid(target.z));
    applySurfaceFogUniforms(
      material,
      distance,
      cameraMotion.fogNearFactor,
      cameraMotion.fogFarFactor,
    );
    const firstId = order[0];
    const lastId = order.length > 0 ? order[order.length - 1] : undefined;
    const first = firstId === undefined ? null : (byId[firstId]?.cell ?? null);
    const last = lastId === undefined ? null : (byId[lastId]?.cell ?? null);
    applyEndpointCellUniforms(
      material,
      settings.highlightEndpoints ? first : null,
      settings.highlightEndpoints ? last : null,
    );
    applyGridSettings(
      material,
      settings.gridVisibility,
      settings.gridShape,
      settings.gridObjectsOnly,
      order.flatMap((id) => (byId[id]?.cell ? [byId[id].cell] : [])),
    );
    if (span !== lastSpanRef.current && meshRef.current !== null) {
      lastSpanRef.current = span;
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = new PlaneGeometry(size, size);
    }
  });
  const initial = useMemo(
    () => computeInfiniteGridCells(20, viewport.aspect) * SURFACE_CELL_WORLD_SIZE,
    [viewport.aspect],
  );
  return (
    <group ref={fillRef}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} material={material}>
        <planeGeometry args={[initial, initial]} />
      </mesh>
    </group>
  );
}
export const SurfaceGrid = memo(SurfaceGridComponent);
