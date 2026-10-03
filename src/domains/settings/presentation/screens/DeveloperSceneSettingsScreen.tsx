import type { ReactElement } from 'react';

import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Switch } from '@/design-system/components/Switch/Switch';

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
      subtitle={subtitle}
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
      <BlurCard title="Отображение">
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
      </BlurCard>
      <BlurCard title="Камера">
        <SceneToggle
          title="Управление камерой"
          subtitle="Показывает отладку и контролы на экране Поле"
          value={developerCameraControlsEnabled}
          onValueChange={setDeveloperCameraControlsEnabled}
        />
      </BlurCard>
    </Screen>
  );
}
