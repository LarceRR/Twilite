import { NetworkError } from '@/shared/errors';

import type { PixelObjectCatalogRepository } from '../../domain/repositories/PixelObjectCatalogRepository';

/** Sandbox has no TPG catalog — connect an API to browse published objects. */
export function createLocalPixelObjectCatalogRepository(): PixelObjectCatalogRepository {
  return {
    listPublished: async () => [],
    getMobile: async (id) => {
      throw new NetworkError('Каталог объектов доступен только с сервером', 503, {
        context: { id },
      });
    },
  };
}
