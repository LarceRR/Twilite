import type { MomentCatalogPage, MomentCatalogQuery } from '../entities/MomentCatalog';

export type MomentCatalogRepository = {
  listPage(query: MomentCatalogQuery): Promise<MomentCatalogPage>;
};
