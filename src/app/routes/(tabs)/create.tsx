import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useThemeColors, sceneColors } from '@/design-system/colors/colors';
import { GlassSurface } from '@/design-system/components/GlassSurface/GlassSurface';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { type IconName, icons } from '@/design-system/icons/icons';
import { radius } from '@/design-system/radius/radius';
import { layout, spacing } from '@/design-system/spacing/spacing';
import { knownKinds } from '@/domains/surface-objects/domain/value-objects/SurfaceObjectKind';

type MomentOption = {
  readonly kind: typeof knownKinds.fire | typeof knownKinds.cloud;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: IconName;
  readonly tint: string;
};

const MOMENTS: readonly MomentOption[] = [
  {
    kind: knownKinds.fire,
    title: 'Хороший момент',
    subtitle: 'Выберите объект из каталога',
    icon: icons.fire,
    tint: sceneColors.fireShell,
  },
  {
    kind: knownKinds.cloud,
    title: 'Плохой момент',
    subtitle: 'Выберите объект из каталога',
    icon: icons.cloud,
    tint: sceneColors.cloudEdge,
  },
];

export default function CreateTabScreen(): ReactElement {
  const theme = useThemeColors();

  return (
    <Screen title="Добавить" reserveTabBar>
      <Text variant="caption" color={theme.textSecondary} style={styles.lead}>
        Что хотите отметить на поле?
      </Text>
      <View style={styles.list}>
        {MOMENTS.map((option) => (
          <Pressable
            key={option.kind}
            accessibilityRole="button"
            accessibilityLabel={option.title}
            hitSlop={layout.hitSlop}
            onPress={() =>
              router.push(
                `/pixel-object-catalog?surfaceKind=${encodeURIComponent(option.kind)}` as Href,
              )
            }
            style={({ pressed }) => [pressed ? styles.pressed : null]}
          >
            <GlassSurface cornerRadius={radius.lg} style={styles.card}>
              <View style={[styles.badge, { backgroundColor: option.tint }]}>
                <Ionicons name={option.icon} size={20} color={theme.textInverted} />
              </View>
              <View style={styles.copy}>
                <Text variant="bodyStrong">{option.title}</Text>
                <Text variant="caption" color={theme.textSecondary}>
                  {option.subtitle}
                </Text>
              </View>
            </GlassSurface>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  pressed: {
    opacity: 0.7,
  },
});
