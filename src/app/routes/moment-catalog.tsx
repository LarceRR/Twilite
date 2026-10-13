import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { openMomentFilters } from '@/app/navigation/openMomentFilters';
import { useUiStore } from '@/app/stores/uiStore';
import { useThemeColors } from '@/design-system/colors/colors';
import { EmptyState } from '@/design-system/components/EmptyState/EmptyState';
import { icons } from '@/design-system/icons/icons';
import { layout } from '@/design-system/spacing/spacing';
import { selectMomentForSurface } from '@/domains/moments/application/selectMomentForSurface';
import type { MomentPreview } from '@/domains/moments/domain/entities/MomentCatalog';
import { MomentCatalogSheet } from '@/domains/moments/presentation/MomentCatalogSheet';
import {
  MOMENT_CATALOG_COPY,
  parseMomentCatalogKind,
} from '@/domains/moments/presentation/momentCatalog';
import { useCreateSurfaceObject } from '@/domains/spaces/presentation/hooks/useCreateSurfaceObject';
import { useSpaces } from '@/domains/spaces/presentation/hooks/useSpaces';
import { createLocalId } from '@/shared/utils/id';

/** Catalog form sheet stacked on the create sheet. `kind` selects good or bad. */
export default function MomentCatalogRoute(): ReactElement {
  const theme = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = parseMomentCatalogKind(params.kind);
  const { activeSpace } = useSpaces();
  const createSurfaceObject = useCreateSurfaceObject();
  const showToast = useUiStore((state) => state.showToast);
  const idempotencyKeys = useRef(new Map<string, string>());

  const selectMoment = async (moment: MomentPreview): Promise<void> => {
    if (kind === null || activeSpace === null || createSurfaceObject.isPending) return;
    const idempotencyKey = idempotencyKeys.current.get(moment.id) ?? createLocalId('surface');
    idempotencyKeys.current.set(moment.id, idempotencyKey);
    try {
      await createSurfaceObject.mutateAsync(
        selectMomentForSurface({
          spaceId: activeSpace.id,
          kind,
          momentId: moment.id,
          idempotencyKey,
        }),
      );
      idempotencyKeys.current.delete(moment.id);
      showToast('Момент добавлен на поверхность');
      router.back();
    } catch {
      showToast('Не удалось добавить момент. Проверьте подключение.', 'negative');
    }
  };

  if (kind === null) {
    return (
      <View style={[styles.unavailable, { backgroundColor: theme.surface }]}>
        <EmptyState
          icon={icons.search}
          title={MOMENT_CATALOG_COPY.unavailableTitle}
          description={MOMENT_CATALOG_COPY.unavailableDescription}
        />
      </View>
    );
  }

  return (
    <MomentCatalogSheet
      kind={kind}
      disabled={activeSpace === null || createSurfaceObject.isPending}
      onFilterPress={() => openMomentFilters(router)}
      onSelect={selectMoment}
    />
  );
}

const styles = StyleSheet.create({
  unavailable: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenGutter,
  },
});
