import { Fragment, type ReactElement, useEffect, useState } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { env } from '@/app/config/env';
import { useColorSchemeToken, useSceneSkyColors, useThemePack } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { ColorSwatches } from '@/design-system/components/ColorSwatches/ColorSwatches';
import { Divider } from '@/design-system/components/Divider/Divider';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import {
  SegmentedControl,
  type SegmentedControlOption,
} from '@/design-system/components/SegmentedControl/SegmentedControl';
import { Slider } from '@/design-system/components/Slider/Slider';
import { Switch } from '@/design-system/components/Switch/Switch';
import { Text } from '@/design-system/components/Text/Text';
import type { SurfaceObjectKind } from '@/domains/surface-objects/domain/value-objects/SurfaceObjectKind';
import { surfaceObjectDefinitions } from '@/scene/objects';
import { useSceneStore } from '@/scene/stores/sceneStore';
import { kindPresentation } from '@/scene/surface-objects/kindPresentation';
import { resolveSurfaceBackground, surfaceOptionsForScheme } from '@/scene/surface/surfaceTheme';
import { ObjectSettingsSheet } from '../components/ObjectSettingsSheet';
import { useSettingsStore } from '../stores/settingsStore';
const GRID_OPTIONS: readonly SegmentedControlOption<'on' | 'off'>[] = [
  { value: 'on', label: 'Вкл' },
  { value: 'off', label: 'Выкл' },
];
const SHAPE_OPTIONS: readonly SegmentedControlOption<'square' | 'round'>[] = [
  { value: 'square', label: 'Квадратная ячейка' },
  { value: 'round', label: 'Круглая' },
];
export function SettingsScreen(): ReactElement {
  const scheme = useColorSchemeToken();
  const activePack = useThemePack();
  const skyStops = useSceneSkyColors();
  const themeHorizon = skyStops[skyStops.length - 1] ?? null;
  const reduceMotion = useSettingsStore((s) => s.reduceMotion),
    showPerformanceOverlay = useSettingsStore((s) => s.showPerformanceOverlay),
    cameraControlEnabled = useSettingsStore((s) => s.cameraControlEnabled),
    showHitbox = useSettingsStore((s) => s.showHitbox),
    manualHitbox = useSettingsStore((s) => s.manualHitbox),
    hitboxWidthPx = useSettingsStore((s) => s.hitboxWidthPx),
    hitboxHeightPx = useSettingsStore((s) => s.hitboxHeightPx),
    gridVisibility = useSettingsStore((s) => s.gridVisibility),
    gridShape = useSettingsStore((s) => s.gridShape),
    gridObjectsOnly = useSettingsStore((s) => s.gridObjectsOnly),
    surfaceBackground = useSettingsStore((s) => s.surfaceBackground),
    highlightEndpoints = useSettingsStore((s) => s.highlightEndpoints);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion),
    setShowPerformanceOverlay = useSettingsStore((s) => s.setShowPerformanceOverlay),
    setCameraControlEnabled = useSettingsStore((s) => s.setCameraControlEnabled),
    setShowHitbox = useSettingsStore((s) => s.setShowHitbox),
    setManualHitbox = useSettingsStore((s) => s.setManualHitbox),
    setHitboxWidthPx = useSettingsStore((s) => s.setHitboxWidthPx),
    setHitboxHeightPx = useSettingsStore((s) => s.setHitboxHeightPx),
    setGridVisibility = useSettingsStore((s) => s.setGridVisibility),
    setGridShape = useSettingsStore((s) => s.setGridShape),
    setGridObjectsOnly = useSettingsStore((s) => s.setGridObjectsOnly),
    setSurfaceBackground = useSettingsStore((s) => s.setSurfaceBackground),
    setHighlightEndpoints = useSettingsStore((s) => s.setHighlightEndpoints);
  const quality = useSceneStore((s) => s.quality);
  const [tunedKind, setTunedKind] = useState<SurfaceObjectKind | null>(null);
  const objects = surfaceObjectDefinitions();
  const resolvedBackground = resolveSurfaceBackground(surfaceBackground, scheme, themeHorizon);
  const backgroundOptions = surfaceOptionsForScheme(scheme);
  const follows = surfaceBackground === null;
  useEffect(() => {
    if (surfaceBackground !== null && !backgroundOptions.includes(surfaceBackground))
      setSurfaceBackground(null);
  }, [backgroundOptions, setSurfaceBackground, surfaceBackground]);
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
      <BlurCard title="Сцена">
        <ListRow
          title="Фон под тему"
          trailing={
            <Switch
              value={follows}
              onValueChange={(v) => setSurfaceBackground(v ? null : resolvedBackground)}
              accessibilityLabel="Фон под тему"
            />
          }
        />
        {follows ? null : (
          <>
            <Divider />
            <ColorSwatches
              accessibilityLabel="Фон поверхности"
              value={resolvedBackground}
              options={backgroundOptions}
              onChange={setSurfaceBackground}
            />
          </>
        )}
        <Divider />
        <ListRow
          title="Подсветка первого и последнего"
          trailing={
            <Switch
              value={highlightEndpoints}
              onValueChange={setHighlightEndpoints}
              accessibilityLabel="Подсветка первого и последнего"
            />
          }
        />
        <Divider />
        <Text variant="body">Показ сетки</Text>
        <SegmentedControl
          accessibilityLabel="Показ сетки"
          value={gridVisibility}
          options={GRID_OPTIONS}
          onChange={setGridVisibility}
        />
        {gridVisibility === 'on' ? (
          <>
            <Text variant="body">Форма ячейки</Text>
            <SegmentedControl
              accessibilityLabel="Форма ячейки"
              value={gridShape}
              options={SHAPE_OPTIONS}
              onChange={setGridShape}
            />
            <ListRow
              title="Только ячейка с объектом"
              trailing={
                <Switch
                  value={gridObjectsOnly}
                  onValueChange={setGridObjectsOnly}
                  accessibilityLabel="Только ячейка с объектом"
                />
              }
            />
          </>
        ) : null}
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
      {objects.length === 0 ? null : (
        <BlurCard title="Объекты">
          {objects.map((d, i) => (
            <Fragment key={d.kind}>
              {i === 0 ? null : <Divider />}
              <ListRow
                title={d.settingsTitle}
                subtitle={d.settingsSubtitle}
                icon={kindPresentation(d.kind).icon}
                iconTint={kindPresentation(d.kind).tint}
                onPress={() => setTunedKind(d.kind)}
              />
            </Fragment>
          ))}
        </BlurCard>
      )}
      <BlurCard title="Отладка">
        <ListRow
          title="Показывать FPS"
          trailing={
            <Switch
              value={showPerformanceOverlay}
              onValueChange={setShowPerformanceOverlay}
              accessibilityLabel="Показывать FPS"
            />
          }
        />
        <Divider />
        <ListRow
          title="Контроль камеры"
          trailing={
            <Switch
              value={cameraControlEnabled}
              onValueChange={setCameraControlEnabled}
              accessibilityLabel="Контроль камеры"
            />
          }
        />
        <Divider />
        <ListRow
          title="Рамка размера спрайта"
          trailing={
            <Switch
              value={showHitbox}
              onValueChange={setShowHitbox}
              accessibilityLabel="Рамка размера спрайта"
            />
          }
        />
        <Divider />
        <ListRow
          title="Ручной размер хитбокса"
          trailing={
            <Switch
              value={manualHitbox}
              onValueChange={setManualHitbox}
              accessibilityLabel="Ручной размер хитбокса"
            />
          }
        />
        {manualHitbox ? (
          <>
            <Text variant="caption">Ширина {Math.round(hitboxWidthPx)} px</Text>
            <Slider
              accessibilityLabel="Ширина хитбокса"
              value={hitboxWidthPx}
              min={16}
              max={400}
              step={2}
              onChange={setHitboxWidthPx}
            />
            <Text variant="caption">Высота {Math.round(hitboxHeightPx)} px</Text>
            <Slider
              accessibilityLabel="Высота хитбокса"
              value={hitboxHeightPx}
              min={16}
              max={600}
              step={2}
              onChange={setHitboxHeightPx}
            />
          </>
        ) : null}
        <Divider />
        <Text variant="caption">
          Качество: {quality.tier}, до {quality.maxInstancesPerKind} объектов в кадре. Версия:{' '}
          {env.mode}
        </Text>
      </BlurCard>
      <ObjectSettingsSheet
        kind={tunedKind}
        visible={tunedKind !== null}
        onClose={() => setTunedKind(null)}
      />
    </Screen>
  );
}
