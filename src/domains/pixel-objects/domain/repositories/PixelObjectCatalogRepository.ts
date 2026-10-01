import type {
  PixelObjectDto,
  PixelObjectMobileDto,
} from '@/shared/contracts/pixelObjects';

export type PixelObjectCatalogRepository = {
  listPublished(): Promise<readonly PixelObjectDto[]>;
  getMobile(id: string): Promise<PixelObjectMobileDto>;
};
