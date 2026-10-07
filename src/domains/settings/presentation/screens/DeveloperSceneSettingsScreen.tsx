import type { ReactElement } from 'react';

import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Switch } from '@/design-system/components/Switch/Switch';
import { useFieldConfigStore } from '@/domains/spaces/presentation/field/fieldConfigStore';
import { useFieldConfig } from '@/domains/spaces/presentation/field/useFieldConfig';

import { FieldConfigSliderRow } from '../components/FieldConfigSliderRow';
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

function FieldTuningCards(): ReactElement {
  const config = useFieldConfig();
  const setSection = useFieldConfigStore((s) => s.setSection);
  const reset = useFieldConfigStore((s) => s.reset);

  return (
    <>
      <BlurCard title="Сетка">
        <FieldConfigSliderRow
          title="Размер ячейки (px)"
          value={config.grid.cellSizePx}
          min={20}
          max={120}
          step={1}
          onChange={(cellSizePx) => setSection('grid', { cellSizePx })}
        />
        <FieldConfigSliderRow
          title="Центральные колонки"
          value={config.grid.centerCols}
          min={2}
          max={30}
          step={1}
          onChange={(centerCols) => setSection('grid', { centerCols })}
        />
        <FieldConfigSliderRow
          title="Доп. колонки с каждой стороны"
          value={config.grid.sideExtraCols}
          min={0}
          max={40}
          step={1}
          onChange={(sideExtraCols) => setSection('grid', { sideExtraCols })}
        />
        <FieldConfigSliderRow
          title="Ряды"
          value={config.grid.rows}
          min={5}
          max={31}
          step={1}
          onChange={(rows) => setSection('grid', { rows })}
        />
      </BlurCard>

      <BlurCard title="Чанки">
        <FieldConfigSliderRow
          title="Look-ahead (px)"
          value={config.chunks.lookAheadPx}
          min={100}
          max={2000}
          step={10}
          onChange={(lookAheadPx) => setSection('chunks', { lookAheadPx })}
        />
        <FieldConfigSliderRow
          title="Чанки сзади"
          value={config.chunks.behind}
          min={0}
          max={5}
          step={1}
          onChange={(behind) => setSection('chunks', { behind })}
        />
        <FieldConfigSliderRow
          title="Чанки впереди"
          value={config.chunks.ahead}
          min={1}
          max={8}
          step={1}
          onChange={(ahead) => setSection('chunks', { ahead })}
        />
      </BlurCard>

      <BlurCard title="Волна">
        <FieldConfigSliderRow
          title="Длительность (сек)"
          value={config.wave.durationSec}
          min={0.1}
          max={2}
          step={0.02}
          digits={2}
          onChange={(durationSec) => setSection('wave', { durationSec })}
        />
        <FieldConfigSliderRow
          title="Размер (px)"
          value={config.wave.sizePx}
          min={32}
          max={200}
          step={2}
          onChange={(sizePx) => setSection('wave', { sizePx })}
        />
        <FieldConfigSliderRow
          title="Макс. альфа"
          value={config.wave.maxAlpha}
          min={0.1}
          max={1}
          step={0.05}
          digits={2}
          onChange={(maxAlpha) => setSection('wave', { maxAlpha })}
        />
      </BlurCard>

      <BlurCard title="Камера (шаги)">
        <FieldConfigSliderRow
          title="Шаг перемещения (px)"
          value={config.camera.moveStepPx}
          min={1}
          max={20}
          step={1}
          onChange={(moveStepPx) => setSection('camera', { moveStepPx })}
        />
        <FieldConfigSliderRow
          title="Шаг поворота (град)"
          value={config.camera.rotateStepDeg}
          min={1}
          max={15}
          step={1}
          onChange={(rotateStepDeg) => setSection('camera', { rotateStepDeg })}
        />
        <FieldConfigSliderRow
          title="Hold ramp (мс)"
          value={config.camera.holdRampMs}
          min={200}
          max={4000}
          step={50}
          onChange={(holdRampMs) => setSection('camera', { holdRampMs })}
        />
      </BlurCard>

      <BlurCard title="Освещение">
        <FieldConfigSliderRow
          title="Ambient"
          value={config.lighting.ambientIntensity}
          min={0}
          max={2}
          step={0.05}
          digits={2}
          onChange={(ambientIntensity) =>
            setSection('lighting', { ambientIntensity })
          }
        />
        <FieldConfigSliderRow
          title="Directional"
          value={config.lighting.directionalIntensity}
          min={0}
          max={2}
          step={0.05}
          digits={2}
          onChange={(directionalIntensity) =>
            setSection('lighting', { directionalIntensity })
          }
        />
      </BlurCard>

      <BlurCard title="Сброс">
        <Button label="Сбросить тюнинг поля" variant="secondary" onPress={reset} />
      </BlurCard>
    </>
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
      <FieldTuningCards />
    </Screen>
  );
}
