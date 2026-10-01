import { BUILTIN_THEME_PACKS, type AppThemePack } from '@/design-system/themes';
import type { HttpClient } from '@/infrastructure/http/httpClient';
import type { KeyValueStorage } from '@/infrastructure/storage/keyValueStorage';
import type { AppThemeDto, AppThemeListDto } from '@/shared/contracts/appThemes';

import type { ThemeCatalogRepository } from '../../domain/repositories/ThemeCatalogRepository';
import { toAppThemePack } from '../mappers/themeMapper';

const APPLIED_PACK_KEY = 'twilite.appliedThemePack';

export function createHttpThemeCatalogRepository(
  http: HttpClient,
  storage: KeyValueStorage,
): ThemeCatalogRepository {
  return {
    async listPublished() {
      const response = await http.get<AppThemeListDto>('app-themes');
      return [...BUILTIN_THEME_PACKS, ...response.items.map(toAppThemePack)];
    },

    async getPublished(id) {
      const builtin = BUILTIN_THEME_PACKS.find((pack) => pack.id === id);
      if (builtin !== undefined) {
        return builtin;
      }
      return toAppThemePack(await http.get<AppThemeDto>(`app-themes/${id}`));
    },

    async loadAppliedPack() {
      return storage.read<AppThemePack>(APPLIED_PACK_KEY);
    },

    async saveAppliedPack(pack) {
      await storage.write(APPLIED_PACK_KEY, pack);
    },
  };
}

export function createLocalThemeCatalogRepository(
  storage: KeyValueStorage,
): ThemeCatalogRepository {
  return {
    async listPublished() {
      return BUILTIN_THEME_PACKS;
    },

    async getPublished(id) {
      const pack = BUILTIN_THEME_PACKS.find((item) => item.id === id);
      if (pack === undefined) {
        throw new Error(`Theme not found: ${id}`);
      }
      return pack;
    },

    async loadAppliedPack() {
      return storage.read<AppThemePack>(APPLIED_PACK_KEY);
    },

    async saveAppliedPack(pack) {
      await storage.write(APPLIED_PACK_KEY, pack);
    },
  };
}
