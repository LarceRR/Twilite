import type { MomentCatalogRepository } from '../../domain/repositories/MomentCatalogRepository';

/** Sandbox has no published projects. The sheet shows its empty state. */
export function createLocalMomentCatalogRepository(): MomentCatalogRepository {
  return {
    async listPage() {
      return { packs: [], nextCursor: null };
    },
  };
}
