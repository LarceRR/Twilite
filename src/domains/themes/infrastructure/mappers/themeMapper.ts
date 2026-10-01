import {
  parseAppThemePack,
  type AppThemePack,
} from '@/design-system/themes';
import type { AppThemeDto } from '@/shared/contracts/appThemes';
import { ValidationError } from '@/shared/errors';

export function toAppThemePack(dto: AppThemeDto): AppThemePack {
  const result = parseAppThemePack({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    authorDisplayName: dto.authorDisplayName,
    createdAt: dto.createdAt,
    colors: dto.colors,
    sceneBackgroundColors: dto.sceneBackgroundColors,
  });

  if (!result.ok) {
    throw new ValidationError(result.error);
  }

  return result.pack;
}
