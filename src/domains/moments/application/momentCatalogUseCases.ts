import type { UseCase } from '@/shared/application/UseCase';

import type { MomentCatalogPage, MomentCatalogQuery } from '../domain/entities/MomentCatalog';
import type { MomentCatalogRepository } from '../domain/repositories/MomentCatalogRepository';

export function listMomentCatalogPageUseCase(
  repository: MomentCatalogRepository,
): UseCase<MomentCatalogQuery, MomentCatalogPage> {
  return (query) => repository.listPage(query);
}
