import { create } from 'zustand';

import type { SurfaceObject } from '../../domain/entities/SurfaceObject';
import { type CellKey, cellKey } from '../../domain/value-objects/Cell';
import type { SurfaceObjectId } from '../../domain/value-objects/SurfaceObjectId';

/**
 * Where a full snapshot came from. `syncedAt` is the query's `dataUpdatedAt`:
 * re-delivering the same (cached) snapshot on remount must not wipe objects that
 * arrived later through realtime or mutations.
 */
export type SurfaceSnapshotSource = {
  readonly spaceId: string;
  readonly syncedAt: number;
};

type SurfaceObjectsState = {
  /** Space the current objects belong to; null until the first snapshot. */
  readonly spaceId: string | null;
  /** `dataUpdatedAt` of the last applied snapshot. */
  readonly syncedAt: number;
  readonly byId: Readonly<Record<string, SurfaceObject>>;
  /** Stable render order, so instance slots never shuffle between frames. */
  readonly order: readonly SurfaceObjectId[];
  readonly byCell: Readonly<Record<CellKey, SurfaceObjectId>>;
  readonly selectedId: SurfaceObjectId | null;
  /** Object currently playing the spawn sequence, if any. */
  readonly spawningId: SurfaceObjectId | null;
  replaceAll: (objects: readonly SurfaceObject[], source?: SurfaceSnapshotSource) => void;
  upsert: (object: SurfaceObject) => void;
  remove: (id: SurfaceObjectId) => void;
  clear: () => void;
  select: (id: SurfaceObjectId | null) => void;
  beginSpawn: (id: SurfaceObjectId) => void;
  endSpawn: (id: SurfaceObjectId) => void;
};

function index(objects: readonly SurfaceObject[]): {
  byId: Record<string, SurfaceObject>;
  order: SurfaceObjectId[];
  byCell: Record<CellKey, SurfaceObjectId>;
} {
  const byId: Record<string, SurfaceObject> = {};
  const byCell: Record<CellKey, SurfaceObjectId> = {};
  const order: SurfaceObjectId[] = [];

  // Oldest first: an object keeps its instance slot for its whole lifetime.
  for (const object of [...objects].sort((left, right) => left.createdAt - right.createdAt)) {
    byId[object.id] = object;
    byCell[cellKey(object.cell)] = object.id;
    order.push(object.id);
  }

  return { byId, order, byCell };
}

const EMPTY = {
  spaceId: null,
  syncedAt: 0,
  byId: {},
  order: [],
  byCell: {},
  selectedId: null,
  spawningId: null,
} as const;

export const useSurfaceObjectsStore = create<SurfaceObjectsState>()((set) => ({
  ...EMPTY,

  replaceAll: (objects, source) =>
    set((state) => {
      // Same snapshot delivered again (remount with cached query data): the store
      // is already at least as fresh, realtime may have added objects since.
      if (
        source !== undefined &&
        state.spaceId === source.spaceId &&
        source.syncedAt <= state.syncedAt
      ) {
        return state;
      }

      const sameSpace = source === undefined || state.spaceId === source.spaceId;
      // Never regress an object the store already knows in a newer version.
      const merged = sameSpace
        ? objects.map((incoming) => {
            const current = state.byId[incoming.id];
            return current !== undefined && current.version > incoming.version
              ? current
              : incoming;
          })
        : objects;
      const next = index(merged);
      const selectionSurvives =
        state.selectedId !== null && next.byId[state.selectedId] !== undefined;

      return {
        ...next,
        spaceId: source?.spaceId ?? state.spaceId,
        syncedAt: source?.syncedAt ?? state.syncedAt,
        selectedId: selectionSurvives ? state.selectedId : null,
        spawningId: sameSpace ? state.spawningId : null,
      };
    }),

  upsert: (object) =>
    set((state) => {
      // Late realtime event for a space we already left.
      if (state.spaceId !== null && object.spaceId !== state.spaceId) {
        return state;
      }

      const previous = state.byId[object.id];

      // Out-of-order delivery (e.g. `created` after `activated`) must not roll back.
      if (previous !== undefined && previous.version > object.version) {
        return state;
      }

      const byId = { ...state.byId, [object.id]: object };
      const order = previous !== undefined ? state.order : [...state.order, object.id];
      const byCell = { ...state.byCell };

      if (previous !== undefined) {
        const previousKey = cellKey(previous.cell);
        if (byCell[previousKey] === object.id) {
          delete byCell[previousKey];
        }
      }

      byCell[cellKey(object.cell)] = object.id;

      return { byId, order, byCell };
    }),

  remove: (id) =>
    set((state) => {
      const removed = state.byId[id];

      if (removed === undefined) {
        return state;
      }

      const byId = { ...state.byId };
      delete byId[id];

      const byCell = { ...state.byCell };
      const key = cellKey(removed.cell);
      if (byCell[key] === id) {
        delete byCell[key];
      }

      return {
        byId,
        byCell,
        order: state.order.filter((candidate) => candidate !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        spawningId: state.spawningId === id ? null : state.spawningId,
      };
    }),

  clear: () => set({ ...EMPTY }),
  select: (selectedId) => set({ selectedId }),
  beginSpawn: (spawningId) => set({ spawningId }),
  endSpawn: (id) => set((state) => (state.spawningId === id ? { spawningId: null } : state)),
}));

export function surfaceObjectsSnapshot(): readonly SurfaceObject[] {
  const { byId, order } = useSurfaceObjectsStore.getState();
  const result: SurfaceObject[] = [];

  for (const id of order) {
    const object = byId[id];

    if (object !== undefined) {
      result.push(object);
    }
  }

  return result;
}

export function surfaceObjectAt(key: CellKey): SurfaceObject | null {
  const state = useSurfaceObjectsStore.getState();
  const id = state.byCell[key];

  return id === undefined ? null : (state.byId[id] ?? null);
}

export const selectObjectCount = (state: SurfaceObjectsState): number => state.order.length;
