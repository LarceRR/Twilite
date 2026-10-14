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

    async getMomentStats() {
      return { total: 0, good: 0, bad: 0 };
    },

    clearMoments() {
      return Promise.resolve();
    },

    async createObject() {
      throw new NetworkError('Добавление объектов требует подключения к API', null);
    },
  };
}
