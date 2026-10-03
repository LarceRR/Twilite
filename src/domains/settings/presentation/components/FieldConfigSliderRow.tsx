import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { Slider } from '@/design-system/components/Slider/Slider';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';

type FieldConfigSliderRowProps = {
  readonly title: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly digits?: number;
  readonly onChange: (value: number) => void;
};

export function FieldConfigSliderRow({
  title,
  value,
  min,
  max,
  step,
  digits = 0,
  onChange,
}: FieldConfigSliderRowProps): ReactElement {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text variant="body">{title}</Text>
        <Text variant="caption">{value.toFixed(digits)}</Text>
      </View>
      <Slider
        accessibilityLabel={title}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
