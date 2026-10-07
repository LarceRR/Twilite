import { useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import {
  type CatalogBand,
  nextActiveIds,
  readScrollMetrics,
  sameIds,
  shouldLoadMore,
} from './catalogScrollWindow';

const LOAD_MORE_THRESHOLD = 320;

export function usePackWindow(loadMore: () => void): {
  readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  readonly setViewport: (height: number) => void;
  readonly setOrigin: (y: number) => void;
  readonly remember: (id: string, band: CatalogBand) => void;
  readonly isActive: (id: string) => boolean;
} {
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const offsetRef = useRef(0);
  const viewportRef = useRef(0);
  const originRef = useRef(0);
  const bandsRef = useRef<ReadonlyMap<string, CatalogBand>>(new Map());
  const activeRef = useRef<ReadonlySet<string>>(new Set());
  const [active, setActive] = useState<ReadonlySet<string>>(activeRef.current);

  const publish = (): void => {
    const next = nextActiveIds(
      activeRef.current,
      bandsRef.current,
      offsetRef.current,
      viewportRef.current,
      originRef.current,
    );
    if (sameIds(activeRef.current, next)) return;
    activeRef.current = next;
    setActive(next);
  };

  return {
    onScroll: (event) => {
      const metrics = readScrollMetrics(event.nativeEvent);
      offsetRef.current = metrics.offset;
      viewportRef.current = metrics.viewport;
      if (shouldLoadMore(metrics, LOAD_MORE_THRESHOLD)) loadMoreRef.current();
      publish();
    },
    setViewport: (height) => {
      if (height <= 0 || viewportRef.current === height) return;
      viewportRef.current = height;
      publish();
    },
    setOrigin: (y) => {
      if (originRef.current === y) return;
      originRef.current = y;
      publish();
    },
    remember: (id, band) => {
      const previous = bandsRef.current.get(id);
      if (previous?.y === band.y && previous.height === band.height) return;
      const next = new Map(bandsRef.current);
      next.set(id, band);
      bandsRef.current = next;
      publish();
    },
    isActive: (id) => active.has(id),
  };
}
