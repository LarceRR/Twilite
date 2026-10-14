import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Input } from '@/design-system/components/Input/Input';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Slider } from '@/design-system/components/Slider/Slider';
import { Switch } from '@/design-system/components/Switch/Switch';
import { Text } from '@/design-system/components/Text/Text';
import { radius } from '@/design-system/radius/radius';
import { layout, spacing } from '@/design-system/spacing/spacing';
import { typography } from '@/design-system/typography/typography';
import { useFieldCameraControlStore } from '@/domains/spaces/presentation/field/fieldCameraControlStore';
import { useFieldConfigStore } from '@/domains/spaces/presentation/field/fieldConfigStore';
import type { FieldConfig } from '@/domains/spaces/presentation/field/fieldConfig';
import { getFieldConfig, useFieldConfig } from '@/domains/spaces/presentation/field/useFieldConfig';

import {
  exportFieldConfigFile,
  importFieldConfigFile,
} from './FieldConfigFileTransfer';
import {
  buildFieldConfigSettingPatch,
  FIELD_CONFIG_SETTING_GROUPS,
  fieldConfigSettingValue,
  type FieldConfigSetting,
  type FieldConfigSettingGroup,
} from './FieldConfigSettingCatalog';

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function inferDigits(step: number): number {
  if (Number.isInteger(step)) return 0;
  const text = step.toString();
  return text.includes('.') ? Math.min(4, text.split('.')[1]?.length ?? 0) : 0;
}

function SettingControl({
  setting,
  config,
  onChange,
}: {
  readonly setting: FieldConfigSetting;
  readonly config: FieldConfig;
  readonly onChange: (setting: FieldConfigSetting, value: unknown) => void;
}): ReactElement {
  const value = fieldConfigSettingValue(config, setting.path);

  if (setting.kind === 'boolean') {
    return (
      <BooleanSettingControl
        setting={setting}
        value={value === true}
        onChange={(next) => onChange(setting, next)}
      />
    );
  }

  if (setting.kind === 'color') {
    return (
      <ColorSettingControl
        setting={setting}
        value={typeof value === 'string' ? value : '#000000'}
        onChange={(next) => onChange(setting, next)}
      />
    );
  }

  const numberValue = typeof value === 'number' && Number.isFinite(value) ? value : setting.min;
  return (
    <NumberSettingControl
      setting={setting}
      value={numberValue}
      onChange={(next) => onChange(setting, next)}
    />
  );
}

function BooleanSettingControl({
  setting,
  value,
  onChange,
}: {
  readonly setting: Extract<FieldConfigSetting, { readonly kind: 'boolean' }>;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}): ReactElement {
  return (
    <ListRow
      title={setting.label}
      subtitle={setting.description}
      trailing={
        <Switch
          value={value}
          onValueChange={onChange}
          accessibilityLabel={setting.label}
        />
      }
    />
  );
}

function NumberSettingControl({
  setting,
  value: numberValue,
  onChange,
}: {
  readonly setting: Extract<FieldConfigSetting, { readonly kind: 'number' }>;
  readonly value: number;
  readonly onChange: (value: number) => void;
}): ReactElement {
  const theme = useThemeColors();
  const boundedValue = Math.max(setting.min, Math.min(setting.max, numberValue));
  const digits = setting.digits ?? inferDigits(setting.step);
  const [draft, setDraft] = useState(numberValue.toFixed(digits));

  useEffect(() => {
    setDraft(numberValue.toFixed(digits));
  }, [numberValue, digits]);

  const commitDraft = (): void => {
    const normalized = draft.trim().replace(',', '.');
    if (normalized.length === 0) {
      setDraft(numberValue.toFixed(digits));
      return;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      setDraft(numberValue.toFixed(digits));
      return;
    }

    const clamped = Math.max(setting.min, Math.min(setting.max, parsed));
    const stepCount = Math.round((clamped - setting.min) / setting.step);
    const stepped = Math.max(
      setting.min,
      Math.min(setting.max, setting.min + stepCount * setting.step),
    );
    const committed = Number(stepped.toFixed(Math.max(digits, 0)));
    onChange(committed);
    setDraft(committed.toFixed(digits));
  };

  return (
    <View style={styles.settingWrap}>
      <View style={styles.settingHeader}>
        <Text variant="bodyStrong">{setting.label}</Text>
      </View>
      <Text variant="caption" color={theme.textSecondary}>
        {setting.description}
      </Text>
      <Input
        icon="calculator-outline"
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commitDraft}
        onSubmitEditing={commitDraft}
        keyboardType="numbers-and-punctuation"
        returnKeyType="done"
        selectTextOnFocus
        accessibilityLabel={`Значение параметра: ${setting.label}`}
        containerStyle={styles.valueInputShell}
        style={styles.valueInput}
      />
      <Slider
        accessibilityLabel={setting.label}
        value={boundedValue}
        min={setting.min}
        max={setting.max}
        step={setting.step}
        onChange={onChange}
      />
      {(numberValue < setting.min || numberValue > setting.max) ? (
        <Text variant="caption" color={theme.textTertiary}>
          Значение выше или ниже диапазона ползунка. Введите значение в допустимом диапазоне.
        </Text>
      ) : null}
    </View>
  );
}

function inferDigits(step: number): number {
  if (Number.isInteger(step)) return 0;
  const text = step.toString();
  return text.includes('.') ? Math.min(4, text.split('.')[1]?.length ?? 0) : 0;
}

function ColorSettingControl({
  setting,
  value,
  onChange,
}: {
  readonly setting: Extract<FieldConfigSetting, { readonly kind: 'color' }>;
  readonly value: string;
  readonly onChange: (value: string) => void;
}): ReactElement {
  const theme = useThemeColors();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <View style={styles.colorSetting}>
      <View style={styles.colorHeader}>
        <View style={styles.colorTitle}>
          <Text variant="bodyStrong">{setting.label}</Text>
          <Text variant="caption" color={theme.textSecondary}>
            {setting.description}
          </Text>
        </View>
        <View
          style={[
            styles.colorPreview,
            {
              backgroundColor: isHexColor(value) ? value : theme.surfaceRaised,
              borderColor: theme.surfaceDivider,
            },
          ]}
        />
      </View>
      <Input
        icon="color-palette-outline"
        value={draft}
        onChangeText={(next) => {
          setDraft(next);
          if (isHexColor(next)) onChange(next);
        }}
        onEndEditing={() => {
          if (!isHexColor(draft)) setDraft(value);
        }}
        placeholder="#FFAE00"
        accessibilityLabel={setting.label}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        containerStyle={styles.valueInputShell}
        style={styles.valueInput}
      />
      {!isHexColor(draft) ? (
        <Text variant="caption" color={theme.textTertiary}>
          Введите HEX-цвет в формате #RRGGBB.
        </Text>
      ) : null}
    </View>
  );
}

function SettingGroup({
  group,
  settings,
  expanded,
  onToggle,
  config,
  onChange,
}: {
  readonly group: FieldConfigSettingGroup;
  readonly settings: readonly FieldConfigSetting[];
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly config: FieldConfig;
  readonly onChange: (setting: FieldConfigSetting, value: unknown) => void;
}): ReactElement {
  const theme = useThemeColors();

  return (
    <BlurCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={group.title}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.groupHeader}
      >
        <View style={styles.groupHeading}>
          <Text variant="sectionTitle">{group.title}</Text>
          <Text variant="caption" color={theme.textSecondary}>
            {group.description}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.groupSettings}>
          {settings.map((setting) => (
            <SettingControl
              key={setting.path}
              setting={setting}
              config={config}
              onChange={onChange}
            />
          ))}
        </View>
      ) : null}
    </BlurCard>
  );
}

function applyCameraConfig(config: FieldConfig): void {
  const cameraControls = useFieldCameraControlStore.getState();
  cameraControls.setPosition(config.camera.position);
  cameraControls.setRotationDeg(config.camera.rotationDeg);
  cameraControls.setProjection({
    fov: config.camera.fov,
    near: config.camera.near,
    far: config.camera.far,
  });
}

export function FieldConfigExplorer(): ReactElement {
  const theme = useThemeColors();
  const config = useFieldConfig();
  const patchOverrides = useFieldConfigStore((state) => state.patchOverrides);
  const hydrate = useFieldConfigStore((state) => state.hydrate);
  const reset = useFieldConfigStore((state) => state.reset);
  const [query, setQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    () => new Set(['grid', 'objectGlow']),
  );
  const [collapsedSearchGroups, setCollapsedSearchGroups] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [transferBusy, setTransferBusy] = useState(false);

  const needle = query.trim().toLocaleLowerCase();

  useEffect(() => {
    setCollapsedSearchGroups(new Set());
  }, [needle]);

  const visibleGroups = useMemo(() => {
    return FIELD_CONFIG_SETTING_GROUPS.flatMap((group) => {
      if (needle.length === 0) return [{ group, settings: group.settings }];
      const groupMatches =
        group.title.toLocaleLowerCase().includes(needle) ||
        group.description.toLocaleLowerCase().includes(needle) ||
        group.id.toLocaleLowerCase().includes(needle);
      const settings = groupMatches
        ? group.settings
        : group.settings.filter((setting) =>
            [setting.label, setting.description, setting.path]
              .some((part) => part.toLocaleLowerCase().includes(needle)),
          );
      return settings.length === 0 ? [] : [{ group, settings }];
    });
  }, [needle]);

  const onChangeSetting = (setting: FieldConfigSetting, value: unknown): void => {
    patchOverrides(buildFieldConfigSettingPatch(config, setting.path, value));

    if (!setting.path.startsWith('camera.')) return;
    const current = getFieldConfig();
    const cameraControls = useFieldCameraControlStore.getState();
    if (setting.path.startsWith('camera.position.')) {
      cameraControls.setPosition(current.camera.position);
    } else if (setting.path.startsWith('camera.rotationDeg.')) {
      cameraControls.setRotationDeg(current.camera.rotationDeg);
    } else if (
      setting.path === 'camera.fov' ||
      setting.path === 'camera.near' ||
      setting.path === 'camera.far'
    ) {
      cameraControls.setProjection({
        fov: current.camera.fov,
        near: current.camera.near,
        far: current.camera.far,
      });
    }
  };

  const resetAll = (): void => {
    reset();
    applyCameraConfig(getFieldConfig());
  };

  const onExport = async (): Promise<void> => {
    setTransferBusy(true);
    try {
      await exportFieldConfigFile(config);
    } catch (error) {
      Alert.alert(
        'Не удалось экспортировать',
        error instanceof Error ? error.message : 'Не получилось создать JSON-файл конфигурации.',
      );
    } finally {
      setTransferBusy(false);
    }
  };

  const onImport = async (): Promise<void> => {
    setTransferBusy(true);
    try {
      const imported = await importFieldConfigFile();
      if (imported === null) return;
      hydrate(imported);
      applyCameraConfig(imported);
      Alert.alert('Конфигурация импортирована', 'Настройки поля обновлены.');
    } catch (error) {
      Alert.alert(
        'Не удалось импортировать',
        error instanceof Error ? error.message : 'Проверьте, что файл содержит корректный JSON конфигурации Twilite.',
      );
    } finally {
      setTransferBusy(false);
    }
  };

  const toggleGroup = (id: string): void => {
    const update = (current: ReadonlySet<string>): ReadonlySet<string> => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    };

    if (needle.length > 0) {
      setCollapsedSearchGroups(update);
    } else {
      setExpandedGroups(update);
    }
  };

  return (
    <View style={styles.explorer}>
      <View style={styles.searchRow}>
        <Input
          icon="search-outline"
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск параметров"
          accessibilityLabel="Поиск параметров конфигурации поля"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          containerStyle={styles.searchInputShell}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск параметров"
            hitSlop={layout.hitSlop}
            onPress={() => setQuery('')}
            style={styles.clearSearch}
          >
            <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {visibleGroups.length === 0 ? (
        <BlurCard>
          <Text variant="bodyStrong">Параметры не найдены</Text>
          <Text variant="caption" color={theme.textSecondary}>
            Попробуйте другое название, ключ конфигурации или часть описания.
          </Text>
        </BlurCard>
      ) : (
        visibleGroups.map(({ group, settings }) => (
          <SettingGroup
            key={group.id}
            group={group}
            settings={settings}
            expanded={
              needle.length > 0
                ? !collapsedSearchGroups.has(group.id)
                : expandedGroups.has(group.id)
            }
            onToggle={() => toggleGroup(group.id)}
            config={config}
            onChange={onChangeSetting}
          />
        ))
      )}

      <BlurCard title="Файл конфигурации">
        <View style={styles.transferButtons}>
          <Button
            block
            compact
            icon="download-outline"
            label="Экспорт JSON"
            variant="secondary"
            loading={transferBusy}
            disabled={transferBusy}
            onPress={() => void onExport()}
          />
          <Button
            block
            compact
            icon="folder-open-outline"
            label="Импорт JSON"
            variant="secondary"
            loading={transferBusy}
            disabled={transferBusy}
            onPress={() => void onImport()}
          />
        </View>
        <Text variant="caption" color={theme.textSecondary}>
          Экспортируйте все текущие значения в JSON или загрузите ранее сохранённый файл.
        </Text>
      </BlurCard>

      <Button
        block
        icon="trash-outline"
        label="Сбросить конфигурацию"
        variant="danger"
        onPress={resetAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  explorer: {
    gap: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputShell: {
    flex: 1,
  },
  clearSearch: {
    padding: spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  groupHeading: {
    flex: 1,
    gap: spacing.xs,
  },
  groupSettings: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  settingWrap: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  valueInputShell: {
    minHeight: layout.controlHeightCompact,
  },
  valueInput: {
    fontVariant: ['tabular-nums'],
  },
  colorSetting: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  colorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  colorTitle: {
    flex: 1,
    gap: spacing.xs,
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  transferButtons: {
    gap: spacing.sm,
  },
});
