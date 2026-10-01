import type { ThemeColors } from '@/design-system/colors/themes';

export type AppThemeStatusDto = 'pending' | 'published' | 'rejected';

export type AppThemeDto = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly authorDisplayName: string;
  readonly authorUserId: string;
  readonly status: AppThemeStatusDto;
  readonly rejectionComment: string | null;
  readonly colors: ThemeColors;
  readonly sceneBackgroundColors: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
};

export type AppThemeListDto = {
  readonly items: readonly AppThemeDto[];
};
