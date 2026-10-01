import type { UseCase } from '@/shared/application/UseCase';
import type { PixelObjectDto, PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';

import type { PixelObjectCatalogRepository } from '../domain/repositories/PixelObjectCatalogRepository';

export function listPublishedPixelObjectsUseCase(
  repo: PixelObjectCatalogRepository,
): UseCase<void, readonly PixelObjectDto[]> {
  return () => repo.listPublished();
}

export function getPixelObjectMobileUseCase(
  repo: PixelObjectCatalogRepository,
): UseCase<string, PixelObjectMobileDto> {
  return (id) => repo.getMobile(id);
}
