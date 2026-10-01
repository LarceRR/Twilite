import type { AppThemePack } from '@/design-system/themes';

export type ThemeCatalogRepository = {
  listPublished(): Promise<readonly AppThemePack[]>;
  getPublished(id: string): Promise<AppThemePack>;
  loadAppliedPack(): Promise<AppThemePack | null>;
  saveAppliedPack(pack: AppThemePack): Promise<void>;
};
