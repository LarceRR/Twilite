import Slider from '@react-native-community/slider';
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Switch } from '@/design-system/components/Switch/Switch';
import { Text } from '@/design-system/components/Text/Text';

import {
  DEFAULT_FIELD_TILE_SETTINGS,
  useFieldTileStore,
} from '@/domains/spaces/presentation/field/fieldTileStore';

export function DeveloperSceneTilesSettingsScreen(): ReactElement {
  const theme = useThemeColors();
  const settings = useFieldTileStore();
  const setOption = settings.setOption;
  const [seedDraft, setSeedDraft] = useState(settings.worldSeed);

  useEffect(() => {
    setSeedDraft(settings.worldSeed);
  }, [settings.worldSeed]);

  return (
    <Screen title="Плитки поля" reserveTabBar={false}>
      <BlurCard title="Генерация плиток">
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text variant="body">Плитки по всей поверхности</Text>
            <Text variant="caption">
              Создаёт детерминированные плитки в свободных ячейках загружаемых чанков.
            </Text>
          </View>
          <Switch
            value={settings.generatedTilesEnabled}
            onValueChange={(value) => setOption('generatedTilesEnabled', value)}
            accessibilityLabel="Плитки по всей поверхности"
          />
        </View>
        <Text variant="caption">Seed мира</Text>
        <TextInput
          value={seedDraft}
          onChangeText={setSeedDraft}
          placeholder="Например: twilite-world-001"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.textPrimary, borderColor: theme.surfaceDivider }]}
        />
        <Button
          label="Применить seed"
          onPress={() =>
            setOption(
              'worldSeed',
              seedDraft.trim() || DEFAULT_FIELD_TILE_SETTINGS.worldSeed,
            )
          }
        />
        <Text variant="caption">
          Одинаковый seed и координаты дают одинаковые высоты плиток даже после прокрутки и
          повторной загрузки чанка.
        </Text>
      </BlurCard>

      <BlurCard title="Высота плиток">
        <Text variant="caption">Неактивные плитки: минимум и максимум от 0 до 3.</Text>
        <NumberSetting
          title="Неактивные плитки: минимум"
          value={settings.inactiveMinHeight}
          min={0}
          max={3}
          onValueChange={(value) =>
            setOption('inactiveMinHeight', Math.min(value, settings.inactiveMaxHeight))
          }
        />
        <NumberSetting
          title="Неактивные плитки: максимум"
          value={settings.inactiveMaxHeight}
          min={0}
          max={3}
          onValueChange={(value) =>
            setOption('inactiveMaxHeight', Math.max(value, settings.inactiveMinHeight))
          }
        />
        <NumberSetting
          title="Активные плитки: минимум"
          value={settings.activeMinHeight}
          min={1}
          max={24}
          onValueChange={(value) =>
            setOption('activeMinHeight', Math.min(value, settings.activeMaxHeight))
          }
        />
        <NumberSetting
          title="Активные плитки: максимум"
          value={settings.activeMaxHeight}
          min={1}
          max={24}
          onValueChange={(value) =>
            setOption('activeMaxHeight', Math.max(value, settings.activeMinHeight))
          }
        />
      </BlurCard>
    </Screen>
  );
}

function NumberSetting({
  title,
  value,
  min,
  max,
  onValueChange,
}: {
  readonly title: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onValueChange: (value: number) => void;
}): ReactElement {
  const theme = useThemeColors();

  return (
    <View style={styles.numberSetting}>
      <View style={styles.numberLabelRow}>
        <Text variant="body">{title}</Text>
        <Text variant="caption">{value}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={theme.accent}
        maximumTrackTintColor={theme.surfaceDivider}
        thumbTintColor={theme.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchText: {
    flex: 1,
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  numberSetting: {
    gap: 4,
  },
  numberLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
