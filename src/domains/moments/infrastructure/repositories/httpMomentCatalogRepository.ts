import type { HttpClient } from '@/infrastructure/http/httpClient';

import type { MomentCatalogRepository } from '../../domain/repositories/MomentCatalogRepository';
import { catalogSearchParams, parseMomentCatalogPage } from '../mappers/momentCatalogMapper';

export function createHttpMomentCatalogRepository(
  http: HttpClient,
  baseUrl: string,
): MomentCatalogRepository {
  return {
    async listPage(query) {
      const payload = await http.get<unknown>(
        'tpg/pixel-objects/catalog',
        catalogSearchParams(query),
      );
      return parseMomentCatalogPage(payload, baseUrl);
    },
  };
}
