import type { Href } from 'expo-router';

import type { CreateMomentKind } from '@/domains/moments/presentation/createMomentOptions';

import { routes } from './types';

type MomentCatalogRouter = {
  push: (href: Href) => void;
};

export function momentCatalogHref(kind: CreateMomentKind): Href {
  return `${routes.momentCatalog}?kind=${kind}` as Href;
}

/** Pushes the catalog form sheet on top of whatever sheet is already open. */
export function openMomentCatalog(router: MomentCatalogRouter, kind: CreateMomentKind): void {
  router.push(momentCatalogHref(kind));
}
