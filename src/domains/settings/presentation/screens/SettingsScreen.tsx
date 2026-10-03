import type { ReactElement } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';

import { useThemePack } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Switch } from '@/design-system/components/Switch/Switch';
import { Text } from '@/design-system/components/Text/Text';

import { useSettingsStore } from '../stores/settingsStore';

export function SettingsScreen(): ReactElement {
  const activePack = useThemePack();
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion);

  return (
    <Screen title="Настройки" reserveTabBar={false}>
      <BlurCard title="Внешний вид">
        <Text variant="body">Текущая тема: {activePack.name}</Text>
        <Text variant="caption">{activePack.authorDisplayName}</Text>
        <Button
          label="Открыть каталог тем"
          onPress={() => router.push('/theme-catalog/' as Href)}
        />
      </BlurCard>
      <BlurCard title="Движение">
        <ListRow
          title="Меньше движения"
          trailing={
            <Switch
              value={reduceMotion}
              onValueChange={setReduceMotion}
              accessibilityLabel="Меньше движения"
            />
          }
        />
      </BlurCard>
      <BlurCard title="Настройки разработчика">
        <ListRow
          title="Сцена"
          subtitle="Сетка, оси, камера и отладочная разметка"
          onPress={() => router.push('/settings/scene' as Href)}
        />
      </BlurCard>
    </Screen>
  );
}
