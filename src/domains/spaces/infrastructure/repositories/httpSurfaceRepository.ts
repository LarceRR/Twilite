import type { HttpClient } from '@/infrastructure/http/httpClient';

import type {
  CreateSurfaceObjectInput,
  SurfaceRepository,
} from '../../domain/repositories/SurfaceRepository';
import { parseSurfaceObject, parseSurfaceSnapshot } from '../mappers/surfaceMapper';

export function createHttpSurfaceRepository(http: HttpClient, baseUrl: string): SurfaceRepository {
  return {
    async getSnapshot(spaceId) {
      const payload = await http.get<unknown>(`spaces/${spaceId}/surface`);
      return parseSurfaceSnapshot(payload, baseUrl);
    },

    async createObject(input: CreateSurfaceObjectInput) {
      const payload = await http.post<unknown>(
        `spaces/${input.spaceId}/surface-objects`,
        { kind: input.kind, pixelObjectId: input.pixelObjectId },
        { idempotencyKey: input.idempotencyKey },
      );
      return parseSurfaceObject(payload, baseUrl);
    },
  };
}
