import { useThemeStore } from '@/design-system/colors/themeStore';
import { parseAppThemePack, type AppThemePack } from '@/design-system/themes';
import { ValidationError } from '@/shared/errors';

import type { ThemeCatalogRepository } from '../domain/repositories/ThemeCatalogRepository';

export function listPublishedThemesUseCase(repo: ThemeCatalogRepository) {
  return async (): Promise<readonly AppThemePack[]> => repo.listPublished();
}

export function getThemeDetailUseCase(repo: ThemeCatalogRepository) {
  return async (id: string): Promise<AppThemePack> => repo.getPublished(id);
}

export function applyThemeUseCase(repo: ThemeCatalogRepository) {
  return async (pack: AppThemePack): Promise<void> => {
    const parsed = parseAppThemePack(pack);
    if (!parsed.ok) {
      throw new ValidationError(parsed.error);
    }
    await repo.saveAppliedPack(parsed.pack);
    useThemeStore.getState().applyPack(parsed.pack);
  };
}

export function hydrateAppliedThemeUseCase(repo: ThemeCatalogRepository) {
  return async (): Promise<void> => {
    const pack = await repo.loadAppliedPack();
    if (pack === null) {
      return;
    }
    const parsed = parseAppThemePack(pack);
    if (!parsed.ok) {
      return;
    }
    useThemeStore.getState().applyPack(parsed.pack);
  };
}
