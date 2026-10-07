import type { Href } from 'expo-router';

import { routes } from './types';

type MomentFiltersRouter = {
  push: (href: Href) => void;
};

export function momentFiltersHref(): Href {
  return routes.momentFilters as Href;
}

/** Pushes the filters form sheet on top of the moment catalog sheet. */
export function openMomentFilters(router: MomentFiltersRouter): void {
  router.push(momentFiltersHref());
}
