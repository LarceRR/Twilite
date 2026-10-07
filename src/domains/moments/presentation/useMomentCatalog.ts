import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useUseCases } from '@/app/providers/ContainerProvider';

import { mergeMomentCatalogPages } from '../application/mergeMomentCatalogPages';
import type { MomentKind, MomentPack } from '../domain/entities/MomentCatalog';

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 300;
const FRESH_MS = 5 * 60_000;

export function useMomentCatalog(
  kind: MomentKind,
  query: string,
): {
  readonly packs: readonly MomentPack[];
  readonly pending: boolean;
  readonly failed: boolean;
  readonly loadingMore: boolean;
  readonly loadMore: () => void;
} {
  const { listMomentCatalogPage } = useUseCases();
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const catalog = useInfiniteQuery({
    queryKey: ['moment-catalog', kind, debounced],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listMomentCatalogPage({
        kind,
        query: debounced,
        limit: PAGE_SIZE,
        ...(typeof pageParam === 'string' ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: FRESH_MS,
  });
  const packs = useMemo(() => mergeMomentCatalogPages(catalog.data?.pages ?? []), [catalog.data]);
  const loadingMore = useRef(false);

  return {
    packs,
    pending: catalog.isPending && packs.length === 0,
    failed: catalog.isError && packs.length === 0,
    loadingMore: catalog.isFetchingNextPage,
    loadMore: () => {
      if (loadingMore.current || !catalog.hasNextPage || catalog.isFetchingNextPage) return;
      loadingMore.current = true;
      void catalog.fetchNextPage().finally(() => {
        loadingMore.current = false;
      });
    },
  };
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
