import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';

/**
 * Every space-scoped key carries the `spaceId`, so switching space can never
 * show another space's cached surface or timeline.
 */
export const queryKeys = {
  spaces: () => ['spaces'] as const,
  profile: () => ['profile'] as const,
  sessions: () => ['sessions'] as const,
  surface: (spaceId: SpaceId) => ['space', spaceId, 'surface'] as const,
  timeline: (spaceId: SpaceId) => ['space', spaceId, 'timeline'] as const,
  space: (spaceId: SpaceId) => ['space', spaceId] as const,
} as const;
