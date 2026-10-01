import { describe, expect, it } from 'vitest';

import { LIGHT_THEME_PACK } from '@/design-system/themes';
import type { AppThemeDto } from '@/shared/contracts/appThemes';

import { toAppThemePack } from './themeMapper';

describe('toAppThemePack', () => {
  it('maps a published dto into a pack', () => {
    const dto: AppThemeDto = {
      id: LIGHT_THEME_PACK.id,
      name: LIGHT_THEME_PACK.name,
      description: LIGHT_THEME_PACK.description,
      authorDisplayName: LIGHT_THEME_PACK.authorDisplayName,
      authorUserId: '00000000-0000-4000-8000-000000000001',
      status: 'published',
      rejectionComment: null,
      colors: LIGHT_THEME_PACK.colors,
      sceneBackgroundColors: LIGHT_THEME_PACK.sceneBackgroundColors,
      createdAt: LIGHT_THEME_PACK.createdAt,
      updatedAt: LIGHT_THEME_PACK.createdAt,
      reviewedAt: null,
    };

    const pack = toAppThemePack(dto);
    expect(pack.id).toBe('light');
    expect(pack.sceneBackgroundColors).toHaveLength(3);
  });
});
