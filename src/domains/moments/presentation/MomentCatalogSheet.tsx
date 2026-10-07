import { memo, type ReactElement, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { EmptyState } from '@/design-system/components/EmptyState/EmptyState';
import { SheetHeading } from '@/design-system/components/SheetHeading/SheetHeading';
import { icons } from '@/design-system/icons/icons';
import { spacing } from '@/design-system/spacing/spacing';

import type { MomentKind } from '../domain/entities/MomentCatalog';
import { CatalogToolbar } from './CatalogToolbar';
import { MomentPackSection } from './MomentPackSection';
import { useReduceMotion } from './MomentSpriteView';
import {
  catalogFromPacks,
  filterMomentCatalog,
  MOMENT_CATALOG_COPY,
  momentCatalogTitle,
} from './momentCatalog';
import { momentCatalogLayout as layout } from './momentCatalogLayout';
import { useCatalogImageHeaders } from './useCatalogImageHeaders';
import { useMomentCatalog } from './useMomentCatalog';
import { usePackWindow } from './usePackWindow';

export type MomentCatalogSheetProps = {
  readonly kind: MomentKind;
  readonly onFilterPress?: (() => void) | undefined;
};

/**
 * Root must be a `ScrollView`. iOS form sheets measure only a direct scroll
 * child of `ScreenContentWrapper` and assign it the sheet frame; extra
 * `Screen` / `View` wrappers leave the sheet transparent over the route below.
 */
function MomentCatalogSheetComponent({
  kind,
  onFilterPress,
}: MomentCatalogSheetProps): ReactElement {
  const theme = useThemeColors();
  const [query, setQuery] = useState('');
  const catalog = useMomentCatalog(kind, query);
  const imageHeaders = useCatalogImageHeaders();
  const allowMotion = !useReduceMotion();
  const visible = filterMomentCatalog(catalogFromPacks(kind, catalog.packs), query);
  const packWindow = usePackWindow(catalog.loadMore);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.surface }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={Platform.OS === 'android'}
      onLayout={(event) => packWindow.setViewport(event.nativeEvent.layout.height)}
      onScroll={packWindow.onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <View collapsable={false}>
        <SheetHeading subtitle={MOMENT_CATALOG_COPY.subtitle} title={momentCatalogTitle(kind)} />
      </View>
      <View
        collapsable={false}
        onLayout={(event) => packWindow.setOrigin(event.nativeEvent.layout.y)}
        style={styles.body}
      >
        <CatalogToolbar onChangeText={setQuery} onFilterPress={onFilterPress} value={query} />
        <CatalogStatus
          empty={catalog.packs.length > 0 && visible.packs.length === 0}
          failed={catalog.failed}
          pending={catalog.pending}
          vacant={!catalog.pending && !catalog.failed && catalog.packs.length === 0}
        />
        {visible.packs.map((pack) => (
          <View
            collapsable={false}
            key={pack.id}
            onLayout={(event) =>
              packWindow.remember(pack.id, {
                y: event.nativeEvent.layout.y,
                height: event.nativeEvent.layout.height,
              })
            }
          >
            <MomentPackSection
              active={packWindow.isActive(pack.id)}
              allowMotion={allowMotion}
              imageHeaders={imageHeaders}
              pack={pack}
            />
          </View>
        ))}
        {catalog.loadingMore ? <ActivityIndicator color={theme.textSecondary} /> : null}
      </View>
    </ScrollView>
  );
}

function CatalogStatus({
  pending,
  failed,
  vacant,
  empty,
}: {
  readonly pending: boolean;
  readonly failed: boolean;
  readonly vacant: boolean;
  readonly empty: boolean;
}): ReactElement | null {
  if (pending) return <ActivityIndicator />;
  if (failed) {
    return (
      <EmptyState
        description={MOMENT_CATALOG_COPY.loadErrorDescription}
        icon={icons.search}
        title={MOMENT_CATALOG_COPY.loadErrorTitle}
      />
    );
  }
  if (vacant) {
    return (
      <EmptyState
        description={MOMENT_CATALOG_COPY.vacantDescription}
        icon={icons.search}
        title={MOMENT_CATALOG_COPY.vacantTitle}
      />
    );
  }
  if (!empty) return null;
  return (
    <EmptyState
      description={MOMENT_CATALOG_COPY.emptyDescription}
      icon={icons.search}
      title={MOMENT_CATALOG_COPY.emptyTitle}
    />
  );
}

export const MomentCatalogSheet = memo(MomentCatalogSheetComponent);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'stretch',
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    gap: layout.headingGap,
    paddingBottom: spacing.lg,
  },
  body: {
    alignSelf: 'stretch',
    gap: layout.sectionGap,
  },
});
