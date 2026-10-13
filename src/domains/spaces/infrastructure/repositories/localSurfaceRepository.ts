import { NetworkError } from '@/shared/errors';

import type { SurfaceRepository } from '../../domain/repositories/SurfaceRepository';

export function createLocalSurfaceRepository(): SurfaceRepository {
  return {
    async getSnapshot(spaceId) {
      return {
        id: `local-surface-${spaceId}`,
        spaceId,
        bounds: null,
        version: 1,
        objects: [],
      };
    },

    async createObject() {
      throw new NetworkError('Добавление объектов требует подключения к API', null);
    },
  };
}
