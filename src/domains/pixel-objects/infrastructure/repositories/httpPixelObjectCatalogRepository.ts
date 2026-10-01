import type { HttpClient } from '@/infrastructure/http/httpClient';
import type {
  PixelObjectDto,
  PixelObjectListDto,
  PixelObjectMobileDto,
} from '@/shared/contracts/pixelObjects';

import type { PixelObjectCatalogRepository } from '../../domain/repositories/PixelObjectCatalogRepository';

export function createHttpPixelObjectCatalogRepository(
  http: HttpClient,
): PixelObjectCatalogRepository {
  return {
    async listPublished(): Promise<readonly PixelObjectDto[]> {
      const response = await http.get<PixelObjectListDto>('tpg/pixel-objects');
      return response.items;
    },
    getMobile(id: string): Promise<PixelObjectMobileDto> {
      return http.get<PixelObjectMobileDto>(`tpg/pixel-objects/${id}/mobile`);
    },
  };
}
