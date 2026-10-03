import { useFrame, type ThreeEvent } from '@react-three/fiber/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { useUiStore } from '@/app/stores/uiStore';
import { useSceneColors } from '@/design-system/colors/colors';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import {
  FIELD_ACTIVE_CENTER_RGBA,
  FIELD_ACTIVE_FILL_RGBA,
  FIELD_LABEL_TEXT_HEX,
} from './fieldGridActiveCells';
import { useFieldCameraControlStore } from './fieldCameraControlStore';
import {
  evictFieldChunkBakes,
  fieldChunkPrefetchIndices,
  isFieldChunkIndexGpuReady,
  prefetchFieldChunk,
  prepareFieldChunkTexture,
  pumpFieldChunkGpuUploads,
  syncMountedChunkWindow,
  type FieldChunkBakeRequest,
} from './fieldGridChunkBake';
import { cellCenterOnPlane } from './fieldGridCells';
import {
  FIELD_CELL_LONG_PRESS_MS,
  FIELD_WAVE_SECOND_BURST_GAP_SEC,
  fieldCellLongPressToastMessage,
  fieldCellTapToastMessage,
  resolveActiveFieldCellAtPoint,
  sameFieldCell,
  shouldKeepFieldCellPress,
} from './fieldGridCellPress';
import {
  fieldChunkConfigsEqual,
  fieldChunkIndicesForCameraX,
} from './fieldGridChunks';
import {
  assignFieldChunkSlots,
  fieldChunkSlotCount,
  fieldChunkSlotsEqual,
} from './fieldGridChunkSlots';
import type { FieldGridConfig } from './fieldGridConfig';
import type { FieldGridCellCoord } from './fieldGridHitTest';
import { FieldGridChunk } from './FieldGridChunk';
import {
  hexToRgba,
  type FieldGridLayerFlags,
  type FieldGridTextureColors,
} from './fieldGridLabelPixels';
import {
  syncFieldGridWaveTime,
  triggerFieldGridWave,
  type FieldGridWaveMaterial,
} from './fieldGridWaveMaterial';

type FieldGridSurfaceProps = {
  readonly config: FieldGridConfig;
};

type PressSession = {
  readonly cell: FieldGridCellCoord & { readonly label: string };
  readonly timer: ReturnType<typeof setTimeout>;
  longFired: boolean;
  lastWorldX: number;
  lastWorldY: number;
};

type BakeSnapshot = {
  readonly base: FieldChunkBakeRequest['base'];
  readonly colors: FieldGridTextureColors;
  readonly layers: FieldGridLayerFlags;
};

function clearPressSession(session: PressSession | null): void {
  if (session == null) return;
  clearTimeout(session.timer);
}

function fireWaveBurstOnMaterials(
  materials: Iterable<FieldGridWaveMaterial>,
  cell: FieldGridCellCoord,
  config: FieldGridConfig,
  nowSec: number,
  count: 1 | 2,
): void {
  const [cx, cy] = cellCenterOnPlane(cell.col, cell.row, config);
  for (const material of materials) {
    triggerFieldGridWave(material, cx, cy, nowSec);
    if (count === 2) {
      triggerFieldGridWave(material, cx, cy, nowSec + FIELD_WAVE_SECOND_BURST_GAP_SEC);
    }
  }
}

function warmChunkPrefetch(desired: readonly number[], bake: BakeSnapshot): void {
  const prefetchIds = fieldChunkPrefetchIndices(desired, 2);
  for (const chunkIndex of prefetchIds) {
    prefetchFieldChunk({
      chunkIndex,
      base: bake.base,
      colors: bake.colors,
      layers: bake.layers,
    });
  }
  evictFieldChunkBakes(prefetchIds);
}

/** Streams field chunks along +X; camera pose is polled in useFrame (no React bind). */
export function FieldGridSurface({ config }: FieldGridSurfaceProps): ReactElement {
  const showToast = useUiStore((s) => s.showToast);
  const scene = useSceneColors();
  const showActiveCells = useSettingsStore((s) => s.developerShowActiveCells);
  const showActiveCenters = useSettingsStore((s) => s.developerShowActiveCellCenters);
  const showCellLabels = useSettingsStore((s) => s.developerShowCellLabels);

  const slotCount = fieldChunkSlotCount();
  const initialCameraX = useFieldCameraControlStore.getState().position.x;
  const desiredRef = useRef<readonly number[]>(
    fieldChunkIndicesForCameraX(initialCameraX, config.cellSize),
  );
  const mountedRef = useRef<readonly number[]>(desiredRef.current);
  const slotsRef = useRef<readonly (number | null)[]>(
    assignFieldChunkSlots(mountedRef.current, [], slotCount),
  );
  const bootstrappedRef = useRef(false);
  const [chunkSlots, setChunkSlots] = useState<readonly (number | null)[]>(
    () => slotsRef.current,
  );
  const timeRef = useRef(0);
  const pressRef = useRef<PressSession | null>(null);
  const materialsRef = useRef(new Map<number, FieldGridWaveMaterial>());

  const bake = useMemo(
    (): BakeSnapshot => ({
      base: { rows: config.rows, cellSize: config.cellSize },
      colors: {
        fill: hexToRgba(scene.surfaceBase),
        line: hexToRgba(scene.surfaceDot),
        text: hexToRgba(FIELD_LABEL_TEXT_HEX),
        activeFill: FIELD_ACTIVE_FILL_RGBA,
        activeCenter: FIELD_ACTIVE_CENTER_RGBA,
      },
      layers: { showActiveCells, showActiveCenters, showCellLabels },
    }),
    [
      config.rows,
      config.cellSize,
      scene.surfaceBase,
      scene.surfaceDot,
      showActiveCells,
      showActiveCenters,
      showCellLabels,
    ],
  );
  const bakeRef = useRef(bake);
  bakeRef.current = bake;

  useEffect(() => {
    for (const chunkIndex of desiredRef.current) {
      prepareFieldChunkTexture({
        chunkIndex,
        base: bake.base,
        colors: bake.colors,
        layers: bake.layers,
      });
    }
    warmChunkPrefetch(desiredRef.current, bake);
  }, [bake]);

  useEffect(
    () => () => {
      clearPressSession(pressRef.current);
      pressRef.current = null;
      materialsRef.current.clear();
    },
    [],
  );

  const onMaterialReady = useCallback(
    (chunkIndex: number, material: FieldGridWaveMaterial) => {
      materialsRef.current.set(chunkIndex, material);
    },
    [],
  );

  const onMaterialDispose = useCallback(
    (chunkIndex: number, material: FieldGridWaveMaterial) => {
      const current = materialsRef.current.get(chunkIndex);
      if (current === material) {
        materialsRef.current.delete(chunkIndex);
      }
    },
    [],
  );

  useFrame(({ clock, gl }) => {
    timeRef.current = clock.elapsedTime;
    const bakeNow = bakeRef.current;
    const cameraX = useFieldCameraControlStore.getState().position.x;
    const isGpuReady = (chunkIndex: number) =>
      isFieldChunkIndexGpuReady(
        chunkIndex,
        bakeNow.base,
        bakeNow.colors,
        bakeNow.layers,
      );

    const beforeUpload = syncMountedChunkWindow(
      cameraX,
      bakeNow.base.cellSize,
      mountedRef.current,
      isGpuReady,
      !bootstrappedRef.current,
    );
    if (!fieldChunkConfigsEqual(desiredRef.current, beforeUpload.desired)) {
      desiredRef.current = beforeUpload.desired;
      warmChunkPrefetch(beforeUpload.desired, bakeNow);
    }

    const budget = bootstrappedRef.current
      ? 1
      : Math.max(beforeUpload.desired.length, 1);
    pumpFieldChunkGpuUploads(gl, budget);
    if (
      !bootstrappedRef.current &&
      beforeUpload.desired.length > 0 &&
      beforeUpload.desired.every(isGpuReady)
    ) {
      bootstrappedRef.current = true;
    }

    const afterUpload = syncMountedChunkWindow(
      cameraX,
      bakeNow.base.cellSize,
      mountedRef.current,
      isGpuReady,
      !bootstrappedRef.current,
    );
    if (afterUpload.mountedChanged) {
      mountedRef.current = afterUpload.mounted;
      const nextSlots = assignFieldChunkSlots(
        afterUpload.mounted,
        slotsRef.current,
        slotCount,
      );
      if (!fieldChunkSlotsEqual(slotsRef.current, nextSlots)) {
        slotsRef.current = nextSlots;
        setChunkSlots(nextSlots);
      }
    }

    for (const material of materialsRef.current.values()) {
      syncFieldGridWaveTime(material, clock.elapsedTime);
    }
  });

  const cancelPress = useCallback((): void => {
    clearPressSession(pressRef.current);
    pressRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>): void => {
      event.stopPropagation();
      cancelPress();
      const cell = resolveActiveFieldCellAtPoint(event.point.x, event.point.y, config);
      if (cell == null) return;

      const timer = setTimeout(() => {
        const session = pressRef.current;
        if (session == null || session.timer !== timer) return;
        const stillOnCell = resolveActiveFieldCellAtPoint(
          session.lastWorldX,
          session.lastWorldY,
          config,
        );
        if (!shouldKeepFieldCellPress(session.cell, stillOnCell)) {
          cancelPress();
          return;
        }
        session.longFired = true;
        fireWaveBurstOnMaterials(
          materialsRef.current.values(),
          session.cell,
          config,
          timeRef.current,
          2,
        );
        showToast(fieldCellLongPressToastMessage(session.cell.label));
      }, FIELD_CELL_LONG_PRESS_MS);

      pressRef.current = {
        cell,
        timer,
        longFired: false,
        lastWorldX: event.point.x,
        lastWorldY: event.point.y,
      };
    },
    [cancelPress, config, showToast],
  );

  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>): void => {
      const session = pressRef.current;
      if (session == null || session.longFired) return;
      session.lastWorldX = event.point.x;
      session.lastWorldY = event.point.y;
      const current = resolveActiveFieldCellAtPoint(event.point.x, event.point.y, config);
      if (!shouldKeepFieldCellPress(session.cell, current)) {
        cancelPress();
      }
    },
    [cancelPress, config],
  );

  const onPointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>): void => {
      event.stopPropagation();
      const session = pressRef.current;
      if (session == null) return;

      const longFired = session.longFired;
      const pressed = session.cell;
      cancelPress();
      if (longFired) return;

      const released = resolveActiveFieldCellAtPoint(event.point.x, event.point.y, config);
      if (!sameFieldCell(pressed, released) || released == null) return;

      fireWaveBurstOnMaterials(
        materialsRef.current.values(),
        released,
        config,
        timeRef.current,
        1,
      );
      showToast(fieldCellTapToastMessage(released.label));
    },
    [cancelPress, config, showToast],
  );

  return (
    <group>
      {chunkSlots.map((chunkIndex, slot) => (
        <FieldGridChunk
          key={slot}
          chunkIndex={chunkIndex}
          base={bake.base}
          onMaterialReady={onMaterialReady}
          onMaterialDispose={onMaterialDispose}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={cancelPress}
          onPointerLeave={cancelPress}
        />
      ))}
    </group>
  );
}
