import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { openMomentFilters } from '@/app/navigation/openMomentFilters';
import { useThemeColors } from '@/design-system/colors/colors';
import { EmptyState } from '@/design-system/components/EmptyState/EmptyState';
import { icons } from '@/design-system/icons/icons';
import { layout } from '@/design-system/spacing/spacing';
import { MomentCatalogSheet } from '@/domains/moments/presentation/MomentCatalogSheet';
import {
  MOMENT_CATALOG_COPY,
  parseMomentCatalogKind,
} from '@/domains/moments/presentation/momentCatalog';

/** Catalog form sheet stacked on the create sheet. `kind` selects good or bad. */
export default function MomentCatalogRoute(): ReactElement {
  const theme = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = parseMomentCatalogKind(params.kind);

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

  return <MomentCatalogSheet kind={kind} onFilterPress={() => openMomentFilters(router)} />;
}

const styles = StyleSheet.create({
  unavailable: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenGutter,
  },
});
