import { useFrame, type ThreeEvent } from '@react-three/fiber/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { useUiStore } from '@/app/stores/uiStore';
import { useSceneColors, useThemeColors } from '@/design-system/colors/colors';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import {
  fieldActiveCenterRgba,
  fieldLabelTextHex,
} from './fieldGridActiveCells';
import { useFieldCameraControlStore } from './fieldCameraControlStore';
import {
  evictFieldChunkBakes,
  fieldChunkBakeCacheKey,
  fieldChunkPrefetchIndices,
  isFieldChunkIndexGpuReady,
  resolveMountedChunkIds,
  prefetchFieldChunk,
  prioritizeFieldChunkGpuUploads,
  pumpFieldChunkGpuUploads,
  type FieldChunkBakeRequest,
} from './fieldGridChunkBake';
import { cellCenterOnPlane } from './fieldGridCells';
import {
  fieldCellLongPressMs,
  fieldCellLongPressToastMessage,
  fieldCellTapToastMessage,
  fieldWaveSecondBurstGapSec,
  resolveActiveFieldCellAtPoint,
  sameFieldCell,
  shouldKeepFieldCellPress,
} from './fieldGridCellPress';
import {
  fieldChunkConfigsEqual,
  fieldChunkIndexFromWorldX,
  fieldVisibleChunkIndices,
} from './fieldGridChunks';
import {
  assignFieldChunkSlots,
  fieldChunkSlotCount,
  fieldChunkSlotsEqual,
} from './fieldGridChunkSlots';
import {
  FIELD_GRID_DIVIDER_WIDTH,
  fieldGridCellPitch,
  type FieldGridConfig,
} from './fieldGridConfig';
import type { FieldGridCellCoord } from './fieldGridHitTest';
import { FieldGridChunk } from './FieldGridChunk';
import {
  hexToRgba,
  type FieldGridLayerFlags,
  type FieldGridTextureColors,
} from './fieldGridLabelPixels';
import {
  syncFieldGridWaveConfig,
  syncFieldGridWaveTime,
  triggerFieldGridWave,
  type FieldGridWaveMaterial,
} from './fieldGridWaveMaterial';
import { useFieldConfig } from './useFieldConfig';

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
  readonly base: {
    readonly rows: number;
    readonly cellSize: number;
    readonly dividerWidth: number;
  };
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
  const gapSec = fieldWaveSecondBurstGapSec();
  for (const material of materials) {
    triggerFieldGridWave(material, cx, cy, nowSec);
    if (count === 2) {
      triggerFieldGridWave(material, cx, cy, nowSec + gapSec);
    }
  }
}

function fieldChunkPriorityOrder(
  desired: readonly number[],
  extraAhead: number,
  ahead: number,
): readonly number[] {
  const prefetchIds = fieldChunkPrefetchIndices(desired, extraAhead);
  // The camera focus is located ahead chunks after the left edge of the
  // desired window (except at world origin, where the window is clamped).
  const anchorOffset = Math.max(0, desired.length - ahead - 1);
  const priority: number[] = [
    ...desired.slice(anchorOffset),
    ...desired.slice(0, anchorOffset).reverse(),
  ];
  for (const chunkIndex of prefetchIds) {
    if (!priority.includes(chunkIndex)) priority.push(chunkIndex);
  }
  return priority;
}

function warmChunkPrefetch(
  desired: readonly number[],
  bake: BakeSnapshot,
  runtimeConfig: ReturnType<typeof useFieldConfig>,
  currentlyMounted: readonly number[],
): void {
  const chunkConfig = runtimeConfig.chunks;
  const prefetchIds = fieldChunkPrefetchIndices(desired, chunkConfig.prefetchExtraAhead);
  const previousEdge = (desired[0] ?? 0) - 1;
  const keepChunkIndices = [
    ...new Set([
      ...prefetchIds,
      ...(previousEdge >= 0 ? [previousEdge] : []),
      ...currentlyMounted,
    ]),
  ];
  const visiblePriorityOrder = fieldChunkPriorityOrder(
    desired,
    chunkConfig.prefetchExtraAhead,
    chunkConfig.ahead,
  );
  const priorityOrder =
    previousEdge >= 0 && !visiblePriorityOrder.includes(previousEdge)
      ? [...visiblePriorityOrder, previousEdge]
      : visiblePriorityOrder;

  // Queue the current focus and forward path first; lower-priority prefetch
  // work must never hold up a chunk the camera is about to show. The previous
  // edge is kept warm at the lowest priority for immediate direction changes.
  const cacheKeyChunkOrder = [
    ...priorityOrder,
    ...currentlyMounted.filter((chunkIndex) => !priorityOrder.includes(chunkIndex)),
  ];
  const keepCacheKeys = cacheKeyChunkOrder.map((chunkIndex) =>
    fieldChunkBakeCacheKey(
      {
        chunkIndex,
        base: bake.base,
        colors: bake.colors,
        layers: bake.layers,
      },
      runtimeConfig,
    ),
  );

  priorityOrder.forEach((chunkIndex, index) => {
    prefetchFieldChunk(
      {
        chunkIndex,
        base: bake.base,
        colors: bake.colors,
        layers: bake.layers,
      },
      priorityOrder.length - index,
      runtimeConfig,
    );
  });
  prioritizeFieldChunkGpuUploads(priorityOrder);
  evictFieldChunkBakes(keepChunkIndices, keepCacheKeys);
}

/** Streams field chunks along +X; camera pose is polled in useFrame (no React bind). */
export function FieldGridSurface({ config }: FieldGridSurfaceProps): ReactElement {
  const showToast = useUiStore((s) => s.showToast);
  const scene = useSceneColors();
  const { accent } = useThemeColors();
  const fieldConfig = useFieldConfig();
  const showActiveCells = useSettingsStore((s) => s.developerShowActiveCells);
  const showActiveCenters = useSettingsStore((s) => s.developerShowActiveCellCenters);
  const showCellLabels = useSettingsStore((s) => s.developerShowCellLabels);

  const slotCount = fieldChunkSlotCount(
    fieldConfig.chunks.behind,
    fieldConfig.chunks.ahead,
  );
  const initialCameraX = useFieldCameraControlStore.getState().position.x;
  const initialCellPitch = fieldGridCellPitch(config);
  const initialAnchor = fieldChunkIndexFromWorldX(
    Math.max(0, initialCameraX + fieldConfig.chunks.lookAheadPx),
    initialCellPitch,
    fieldConfig.chunks.cols,
  );
  const anchorRef = useRef(initialAnchor);
  const chunkConfigRef = useRef(fieldConfig.chunks);
  const cellPitchRef = useRef(initialCellPitch);
  const desiredRef = useRef<readonly number[]>(
    fieldVisibleChunkIndices(
      initialAnchor,
      fieldConfig.chunks.behind,
      fieldConfig.chunks.ahead,
    ),
  );
  const mountedRef = useRef<readonly number[]>(desiredRef.current);
  const slotsRef = useRef<readonly (number | null)[]>(
    assignFieldChunkSlots(mountedRef.current, [], slotCount),
  );
  const [chunkSlots, setChunkSlots] = useState<readonly (number | null)[]>(
    () => slotsRef.current,
  );
  const bootstrappedRef = useRef(false);
  const timeRef = useRef(0);
  const pressRef = useRef<PressSession | null>(null);
  const materialsRef = useRef(new Map<number, FieldGridWaveMaterial>());

  const bake = useMemo(
    (): BakeSnapshot => ({
      base: {
        rows: config.rows,
        cellSize: config.cellSize,
        dividerWidth: config.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH,
      },
      colors: {
        fill: hexToRgba(scene.surfaceBase),
        line: hexToRgba(scene.surfaceDot),
        text: hexToRgba(fieldLabelTextHex()),
        activeFill: hexToRgba(accent),
        activeCenter: fieldActiveCenterRgba(),
      },
      layers: { showActiveCells, showActiveCenters, showCellLabels },
    }),
    [
      config.rows,
      config.cellSize,
      config.dividerWidth,
      scene.surfaceBase,
      scene.surfaceDot,
      accent,
      showActiveCells,
      showActiveCenters,
      showCellLabels,
      fieldConfig.activeCells,
      fieldConfig.labels,
    ],
  );
  const bakeRef = useRef(bake);
  bakeRef.current = bake;

  useEffect(() => {
    warmChunkPrefetch(desiredRef.current, bake, fieldConfig, mountedRef.current);
  }, [bake, fieldConfig.chunks]);

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
      syncFieldGridWaveConfig(material);
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

  // Wave tuning is static across frames. Sync only when its config changes,
  // not once per chunk on every render frame.
  useEffect(() => {
    for (const material of materialsRef.current.values()) {
      syncFieldGridWaveConfig(material);
    }
  }, [fieldConfig.wave]);

  useFrame(({ clock, gl, camera }) => {
    timeRef.current = clock.elapsedTime;
    const bakeNow = bakeRef.current;

    // Read the live Three.js camera. The control store is intentionally only
    // committed at gesture boundaries, so reading it here starves streaming
    // while a finger is still moving the camera.
    const cameraX = camera.position.x;
    const cellPitch = fieldGridCellPitch(bakeNow.base);
    const chunkConfig = fieldConfig.chunks;
    const anchor = fieldChunkIndexFromWorldX(
      Math.max(0, cameraX + chunkConfig.lookAheadPx),
      cellPitch,
      chunkConfig.cols,
    );
    const streamConfigChanged =
      chunkConfigRef.current !== chunkConfig || cellPitchRef.current !== cellPitch;
    if (streamConfigChanged) {
      chunkConfigRef.current = chunkConfig;
      cellPitchRef.current = cellPitch;
    }
    const desiredChanged = anchor !== anchorRef.current || streamConfigChanged;

    if (desiredChanged) {
      anchorRef.current = anchor;
      const desired = fieldVisibleChunkIndices(
        anchor,
        chunkConfig.behind,
        chunkConfig.ahead,
      );
      desiredRef.current = desired;
      warmChunkPrefetch(desired, bakeNow, fieldConfig, mountedRef.current);
    }

    const desired = desiredRef.current;

    const isGpuReady = (chunkIndex: number) =>
      isFieldChunkIndexGpuReady(
        chunkIndex,
        bakeNow.base,
        bakeNow.colors,
        bakeNow.layers,
        fieldConfig,
      );

    // GPU uploads can synchronize with the graphics driver. One upload per
    // frame bounds that cost instead of turning several completed bakes into
    // a single visible frame hitch.
    const uploaded = pumpFieldChunkGpuUploads(gl, 1);

    if (
      !bootstrappedRef.current &&
      desired.length > 0 &&
      desired.every(isGpuReady)
    ) {
      bootstrappedRef.current = true;
    }

    // During initial bootstrap, keep the full window mounted to avoid a
    // mount/unmount cycle for every texture upload. Afterward, only introduce
    // GPU-ready chunks and retain the old edge while its replacement warms.
    if (desiredChanged || uploaded > 0 || !bootstrappedRef.current) {
      const nextMounted = resolveMountedChunkIds(
        desired,
        mountedRef.current,
        isGpuReady,
        !bootstrappedRef.current,
      );
      if (!fieldChunkConfigsEqual(mountedRef.current, nextMounted)) {
        mountedRef.current = nextMounted;
        const nextSlots = assignFieldChunkSlots(
          nextMounted,
          slotsRef.current,
          slotCount,
        );
        if (!fieldChunkSlotsEqual(slotsRef.current, nextSlots)) {
          slotsRef.current = nextSlots;
          setChunkSlots(nextSlots);
        }
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
      }, fieldCellLongPressMs());

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
