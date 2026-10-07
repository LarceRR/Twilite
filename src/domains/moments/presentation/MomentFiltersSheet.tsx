import { memo, type ReactElement, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { GlassTintButton } from '@/design-system/components/GlassTintButton/GlassTintButton';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { fontFamily, fontWeights } from '@/design-system/typography/fonts';

import {
  DEFAULT_MOMENT_FILTERS,
  momentFiltersLayout as layout,
  MOMENT_FILTERS_APPLY_TINT,
  MOMENT_FILTERS_COPY,
  type MomentFiltersDraft,
  momentFilterColorById,
  nextMomentFilterColorId,
  sanitizePriceInput,
} from './momentFilters';

export type MomentFiltersSheetProps = {
  readonly initial?: MomentFiltersDraft;
  readonly onApply: (draft: MomentFiltersDraft) => void;
};

/**
 * Root is a `ScrollView` so stacked iOS form sheets still receive a real frame
 * (same constraint as the moment catalog sheet).
 */
function MomentFiltersSheetComponent({
  initial = DEFAULT_MOMENT_FILTERS,
  onApply,
}: MomentFiltersSheetProps): ReactElement {
  const theme = useThemeColors();
  const [draft, setDraft] = useState(initial);
  const selectedColor = momentFilterColorById(draft.colorId);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.surface }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={Platform.OS === 'android'}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View collapsable={false} style={styles.header}>
        <Text align="center" style={styles.title} variant="bodyStrong">
          {MOMENT_FILTERS_COPY.title}
        </Text>
      </View>

      <View collapsable={false} style={styles.body}>
        <View style={styles.priceBlock}>
          <Text color={theme.textTertiary} style={styles.fieldLabel}>
            {MOMENT_FILTERS_COPY.priceLabel}
          </Text>
          <View style={styles.priceRow}>
            <PriceField
              label={MOMENT_FILTERS_COPY.priceFrom}
              value={draft.priceFrom}
              onChangeText={(priceFrom) => setDraft((prev) => ({ ...prev, priceFrom }))}
            />
            <View style={[styles.dash, { backgroundColor: theme.textTertiary }]} />
            <PriceField
              label={MOMENT_FILTERS_COPY.priceTo}
              value={draft.priceTo}
              onChangeText={(priceTo) => setDraft((prev) => ({ ...prev, priceTo }))}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${MOMENT_FILTERS_COPY.colorLabel}: ${selectedColor.label}`}
          onPress={() =>
            setDraft((prev) => ({
              ...prev,
              colorId: nextMomentFilterColorId(prev.colorId),
            }))
          }
          style={styles.colorRow}
        >
          <Text color={theme.textTertiary} style={styles.fieldLabel}>
            {MOMENT_FILTERS_COPY.colorLabel}
          </Text>
          <View style={styles.colorValue}>
            <Text style={styles.colorName}>{selectedColor.label}</Text>
            <View style={[styles.swatch, { backgroundColor: selectedColor.hex }]} />
          </View>
        </Pressable>
      </View>

      <View collapsable={false} style={styles.footer}>
        <GlassTintButton
          label={MOMENT_FILTERS_COPY.applyLabel}
          labelColor="#0C0A0E"
          tintColor={MOMENT_FILTERS_APPLY_TINT}
          onPress={() => onApply(draft)}
        />
      </View>
    </ScrollView>
  );
}

function PriceField({
  label,
  value,
  onChangeText,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
}): ReactElement {
  const theme = useThemeColors();

  return (
    <View style={[styles.priceField, { backgroundColor: theme.surfaceSunken }]}>
      <Text color={theme.textTertiary} style={styles.pricePrefix}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={(raw) => onChangeText(sanitizePriceInput(raw))}
        keyboardType="number-pad"
        accessibilityLabel={label}
        placeholderTextColor={theme.textTertiary}
        style={[styles.priceInput, { color: theme.textTertiary }]}
        {...Platform.select({
          android: { includeFontPadding: false, textAlignVertical: 'center' as const },
        })}
      />
    </View>
  );
}

export const MomentFiltersSheet = memo(MomentFiltersSheetComponent);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignSelf: 'stretch',
    paddingTop: layout.sheetPaddingTop,
    paddingHorizontal: layout.sheetPaddingX,
    paddingBottom: layout.sheetPaddingBottom,
    gap: layout.sectionGap,
  },
  header: {
    alignSelf: 'stretch',
    minHeight: layout.headerMinHeight,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily('semiBold'),
    fontWeight: fontWeights.semiBold,
    fontSize: 16,
    lineHeight: 19,
  },
  body: {
    alignSelf: 'stretch',
    gap: layout.bodyGap,
    flexGrow: 1,
  },
  footer: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
  },
  priceBlock: {
    alignSelf: 'stretch',
    gap: layout.priceLabelGap,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.priceRowGap,
  },
  priceField: {
    flex: 1,
    height: layout.priceFieldHeight,
    borderRadius: layout.priceFieldRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.priceFieldPaddingX,
    gap: spacing.sm,
  },
  pricePrefix: {
    fontSize: 14,
    lineHeight: 16,
  },
  priceInput: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fontFamily('regular'),
    fontSize: 14,
    lineHeight: 16,
    paddingVertical: 0,
  },
  dash: {
    width: layout.dashWidth,
    height: StyleSheet.hairlineWidth,
  },
  colorRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: layout.colorRowGap,
    minHeight: layout.swatchSize,
  },
  colorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.colorValueGap,
  },
  colorName: {
    fontSize: 14,
    lineHeight: 16,
  },
  swatch: {
    width: layout.swatchSize,
    height: layout.swatchSize,
    borderRadius: layout.swatchRadius,
  },
});
