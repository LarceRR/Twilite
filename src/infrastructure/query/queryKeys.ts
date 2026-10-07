import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';

export const queryKeys = {
  spaces: () => ['spaces'] as const,
  profile: () => ['profile'] as const,
  sessions: () => ['sessions'] as const,
  space: (spaceId: SpaceId) => ['space', spaceId] as const,
} as const;
