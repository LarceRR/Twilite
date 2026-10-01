import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useServices, useUseCases } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { useSpaceStore } from '@/domains/spaces/presentation/stores/spaceStore';
import { queryKeys } from '@/infrastructure/query/queryKeys';
import { kindPresentation } from '@/scene/surface-objects/kindPresentation';
import { ConflictError, toAppError } from '@/shared/errors';
import type { SurfaceObject, SurfaceObjectMetadata } from '../../domain/entities/SurfaceObject';
import type { SurfaceObjectKind } from '../../domain/value-objects/SurfaceObjectKind';
import { useSurfaceObjectsStore } from '../stores/surfaceObjectsStore';
export type CreateSurfaceObjectInput = {
  readonly kind: SurfaceObjectKind;
  readonly note?: string;
  readonly metadata?: SurfaceObjectMetadata;
};

export type SurfaceObjectActions = {
  readonly create: (input: CreateSurfaceObjectInput) => void;
  readonly createAsync: (input: CreateSurfaceObjectInput) => Promise<SurfaceObject>;
  readonly toggleFavorite: (object: SurfaceObject) => void;
  readonly remove: (object: SurfaceObject) => void;
  readonly isCreating: boolean;
};
export function useSurfaceObjectActions(spaceId: SpaceId | null): SurfaceObjectActions {
  const useCases = useUseCases();
  const { logger } = useServices();
  const queryClient = useQueryClient();
  const upsert = useSurfaceObjectsStore((s) => s.upsert);
  const remove = useSurfaceObjectsStore((s) => s.remove);
  const showToast = useUiStore((s) => s.showToast);
  const invalidate = useCallback(() => {
    const active = spaceId ?? useSpaceStore.getState().activeSpaceId;
    if (active !== null) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.surface(active) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline(active) });
    }
  }, [queryClient, spaceId]);
  const reportFailure = useCallback(
    (error: unknown, fallback: string) => {
      const appError = toAppError(error);
      logger.error(fallback, appError);
      if (appError instanceof ConflictError) {
        showToast('Данные обновились — попробуйте снова', 'negative');
        invalidate();
      } else showToast(appError.message, 'negative');
    },
    [logger, showToast, invalidate],
  );
  const createMutation = useMutation({
    mutationFn: (input: CreateSurfaceObjectInput) => {
      if (spaceId === null) {
        return Promise.reject(new ConflictError('Пространство не выбрано'));
      }
      const note = input.note?.trim() ?? '';
      const metadata: SurfaceObjectMetadata = {
        ...(input.metadata ?? {}),
        ...(note.length > 0 ? { note } : {}),
      };
      return useCases.createSurfaceObject({
        spaceId,
        kind: input.kind,
        ...(Object.keys(metadata).length === 0 ? {} : { metadata }),
      });
    },
    onSuccess: async (created) => {
      upsert(created);
      try {
        upsert(
          await useCases.activateSurfaceObject({
            id: created.id,
            currentState: created.state,
            version: created.version,
          }),
        );
      } catch (error) {
        logger.warn('Не удалось активировать объект', { error: String(error) });
      }
      showToast(`${kindPresentation(created.kind).title} появился на поверхности`, 'positive');
      if (spaceId !== null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.surface(spaceId) });
      }
    },
    onError: (e) => reportFailure(e, 'Не удалось создать объект'),
  });
  const favoriteMutation = useMutation({
    mutationFn: (object: SurfaceObject) =>
      useCases.toggleFavorite({
        id: object.id,
        favorite: !object.favorite,
        version: object.version,
      }),
    onSuccess: (updated) => upsert(updated),
    onError: (e) => reportFailure(e, 'Не удалось обновить объект'),
  });
  const deleteMutation = useMutation({
    mutationFn: (object: SurfaceObject) =>
      useCases.deleteSurfaceObject({ id: object.id, version: object.version }),
    onSuccess: (_r, object) => {
      remove(object.id);
      invalidate();
    },
    onError: (e) => reportFailure(e, 'Не удалось удалить объект'),
  });
  return {
    create: useCallback((input) => createMutation.mutate(input), [createMutation]),
    createAsync: useCallback((input) => createMutation.mutateAsync(input), [createMutation]),
    toggleFavorite: useCallback((object) => favoriteMutation.mutate(object), [favoriteMutation]),
    remove: useCallback((object) => deleteMutation.mutate(object), [deleteMutation]),
    isCreating: createMutation.isPending,
  };
}
