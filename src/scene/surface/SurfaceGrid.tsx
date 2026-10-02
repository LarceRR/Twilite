// @refresh reset
import { useFrame, useThree } from '@react-three/fiber/native';
import { memo, type ReactElement, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { type Group, type Mesh, NoToneMapping } from 'three';
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
  type SurfaceGridMaterial,
} from './surfaceGridMaterial';
import { resolveSurfaceBackground } from './surfaceTheme';

/** Object- and settings-driven uniforms. Runs on store changes, not per frame. */
function syncObjectUniforms(material: SurfaceGridMaterial): void {
  const { order, byId } = useSurfaceObjectsStore.getState();
  const settings = useSettingsStore.getState();
  const cells: { readonly x: number; readonly y: number }[] = [];

  for (const id of order) {
    const cell = byId[id]?.cell;
    if (cell !== undefined) {
      cells.push(cell);
    }
  }

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
    cells,
  );
}

function SurfaceGridComponent(): ReactElement {
  const fillRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
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

  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    gl.setClearColor(background, 1);
    gl.toneMapping = NoToneMapping;
    applySurfaceThemeUniforms(material, background);
  }, [gl, background, material]);

  // Previously rebuilt every frame: a flatMap over all objects plus 64 uniform
  // writes, 60 times a second, even when nothing changed.
  useEffect(() => {
    syncObjectUniforms(material);
    const unsubscribeObjects = useSurfaceObjectsStore.subscribe((state, previous) => {
      if (state.order !== previous.order || state.byId !== previous.byId) {
        syncObjectUniforms(material);
      }
    });
    const unsubscribeSettings = useSettingsStore.subscribe(() => syncObjectUniforms(material));
    return () => {
      unsubscribeObjects();
      unsubscribeSettings();
    };
  }, [material]);

  useFrame(() => {
    const { target, distance } = useCameraStore.getState().orbit;
    fillRef.current?.position.set(snapToCellGrid(target.x), 0, snapToCellGrid(target.z));
    applySurfaceFogUniforms(
      material,
      distance,
      cameraMotion.fogNearFactor,
      cameraMotion.fogFarFactor,
    );

    // Unit plane scaled to the span: zooming used to allocate a new
    // PlaneGeometry (and a GPU upload) every time the span changed by one cell.
    const mesh = meshRef.current;
    if (mesh !== null) {
      const size = computeInfiniteGridCells(distance, viewport.aspect) * SURFACE_CELL_WORLD_SIZE;
      if (mesh.scale.x !== size) {
        mesh.scale.set(size, size, 1);
      }
    }
  });

  return (
    <group ref={fillRef}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} material={material} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}
export const SurfaceGrid = memo(SurfaceGridComponent);
