import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { GlassSurface } from '@/design-system/components/GlassSurface/GlassSurface';
import { icons } from '@/design-system/icons/icons';
import { spacing } from '@/design-system/spacing/spacing';
import { fontFamily } from '@/design-system/typography/fonts';

import { MOMENT_CATALOG_COPY } from './momentCatalog';
import { momentCatalogLayout as layout } from './momentCatalogLayout';

export type CatalogToolbarProps = {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly onFilterPress?: (() => void) | undefined;
};

/**
 * Catalog search + filters. Liquid Glass on iOS 26+, translucent glass fill
 * elsewhere — same surface family as field / tab chrome.
 */
function CatalogToolbarComponent({
  value,
  onChangeText,
  onFilterPress,
}: CatalogToolbarProps): ReactElement {
  const theme = useThemeColors();

  return (
    <View style={styles.row}>
      <GlassSurface cornerRadius={spacing.md} style={styles.search}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={MOMENT_CATALOG_COPY.searchPlaceholder}
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel={MOMENT_CATALOG_COPY.searchPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          style={[styles.input, { color: theme.textPrimary }]}
        />
      </GlassSurface>
      <FilterButton onPress={onFilterPress} color={theme.textSecondary} />
    </View>
  );
}

function FilterButton({
  onPress,
  color,
}: {
  readonly onPress?: (() => void) | undefined;
  readonly color: string;
}): ReactElement {
  const icon = <Ionicons name={icons.filters} size={18} color={color} />;
  const frame = (
    <GlassSurface
      cornerRadius={spacing.md}
      interactive={onPress !== undefined}
      style={styles.filter}
    >
      <View style={styles.filterInner}>{icon}</View>
    </GlassSurface>
  );
  if (onPress === undefined) return frame;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={MOMENT_CATALOG_COPY.filterLabel}
      onPress={onPress}
    >
      {frame}
    </Pressable>
  );
}

export const CatalogToolbar = memo(CatalogToolbarComponent);

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.toolbarGap,
    marginBottom: spacing.md,
  },
  search: {
    flex: 1,
    height: layout.toolbarHeight,
    justifyContent: 'center',
    paddingHorizontal: layout.searchPaddingX,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily('regular'),
    fontSize: 12,
    lineHeight: 14,
    paddingHorizontal: spacing.sm,
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: 'center' as const },
    }),
  },
  filter: {
    width: layout.toolbarHeight,
    height: layout.toolbarHeight,
  },
  filterInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
