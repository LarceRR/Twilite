import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Switch } from '@/design-system/components/Switch/Switch';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';

import { FieldConfigExplorer } from '../components/FieldConfigExplorer';
import { useSettingsStore } from '../stores/settingsStore';

type SceneToggleProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
};

function SceneToggle({
  title,
  subtitle,
  value,
  onValueChange,
}: SceneToggleProps): ReactElement {
  return (
    <ListRow
      title={title}
      {...(subtitle !== undefined ? { subtitle } : {})}
      trailing={
        <Switch
          value={value}
          onValueChange={onValueChange}
          accessibilityLabel={title}
        />
      }
    />
  );
}

function CollapsibleSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactElement {
  const theme = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <BlurCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.sectionHeader}
      >
        <Text variant="sectionTitle">{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
      {expanded ? <View style={styles.sectionBody}>{children}</View> : null}
    </BlurCard>
  );
}

export function DeveloperSceneSettingsScreen(): ReactElement {
  const developerCameraControlsEnabled = useSettingsStore(
    (s) => s.developerCameraControlsEnabled,
  );
  const setDeveloperCameraControlsEnabled = useSettingsStore(
    (s) => s.setDeveloperCameraControlsEnabled,
  );
  const developerShowActiveCells = useSettingsStore((s) => s.developerShowActiveCells);
  const setDeveloperShowActiveCells = useSettingsStore(
    (s) => s.setDeveloperShowActiveCells,
  );
  const developerShowWorldAxes = useSettingsStore((s) => s.developerShowWorldAxes);
  const setDeveloperShowWorldAxes = useSettingsStore((s) => s.setDeveloperShowWorldAxes);
  const developerShowCellLabels = useSettingsStore((s) => s.developerShowCellLabels);
  const setDeveloperShowCellLabels = useSettingsStore(
    (s) => s.setDeveloperShowCellLabels,
  );
  const developerShowActiveCellCenters = useSettingsStore(
    (s) => s.developerShowActiveCellCenters,
  );
  const setDeveloperShowActiveCellCenters = useSettingsStore(
    (s) => s.setDeveloperShowActiveCellCenters,
  );

  return (
    <Screen title="Сцена" reserveTabBar={false}>
      <FieldConfigExplorer />

      <CollapsibleSection title="Отображение">
        <SceneToggle
          title="Отображать активные ячейки"
          subtitle="Жёлтая полоса активных клеток"
          value={developerShowActiveCells}
          onValueChange={setDeveloperShowActiveCells}
        />
        <SceneToggle
          title="Отображать осевые стрелки"
          subtitle="RGB-оси в мире поля"
          value={developerShowWorldAxes}
          onValueChange={setDeveloperShowWorldAxes}
        />
        <SceneToggle
          title="Отображать нумерацию ячеек поля"
          value={developerShowCellLabels}
          onValueChange={setDeveloperShowCellLabels}
        />
        <SceneToggle
          title="Отображать центр активных ячеек"
          subtitle="Розовые точки в центре активных клеток"
          value={developerShowActiveCellCenters}
          onValueChange={setDeveloperShowActiveCellCenters}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Камера">
        <SceneToggle
          title="Управление камерой"
          subtitle="Показывает отладку и контролы на экране Поле"
          value={developerCameraControlsEnabled}
          onValueChange={setDeveloperCameraControlsEnabled}
        />
      </CollapsibleSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionBody: {
    paddingTop: spacing.sm,
  },
});
