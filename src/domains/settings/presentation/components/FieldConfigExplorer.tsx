import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
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
  buildFieldConfigSettingPatch,
  FIELD_CONFIG_SETTING_GROUPS,
  fieldConfigSettingValue,
  type FieldConfigSetting,
  type FieldConfigSettingGroup,
} from './FieldConfigSettingCatalog';

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function parameterCountLabel(count: number): string {
  const finalTwoDigits = count % 100;
  if (finalTwoDigits >= 11 && finalTwoDigits <= 14) return `${count} параметров`;
  const finalDigit = count % 10;
  if (finalDigit === 1) return `${count} параметр`;
  if (finalDigit >= 2 && finalDigit <= 4) return `${count} параметра`;
  return `${count} параметров`;
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
  const theme = useThemeColors();
  const value = fieldConfigSettingValue(config, setting.path);

  if (setting.kind === 'boolean') {
    return (
      <ListRow
        title={setting.label}
        subtitle={setting.description}
        trailing={
          <Switch
            value={value === true}
            onValueChange={(next) => onChange(setting, next)}
            accessibilityLabel={setting.label}
          />
        }
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

  const numberValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const boundedValue = Math.max(setting.min, Math.min(setting.max, numberValue));
  const digits = setting.digits ?? inferDigits(setting.step);

  return (
    <View style={styles.settingWrap}>
      <View style={styles.settingHeader}>
        <Text variant="bodyStrong">{setting.label}</Text>
        <Text variant="caption" color={theme.textSecondary}>
          {numberValue.toFixed(digits)}
        </Text>
      </View>
      <Text variant="caption" color={theme.textSecondary}>
        {setting.description}
      </Text>
      <Slider
        accessibilityLabel={setting.label}
        value={boundedValue}
        min={setting.min}
        max={setting.max}
        step={setting.step}
        onChange={(next) => onChange(setting, next)}
      />
      {(numberValue < setting.min || numberValue > setting.max) ? (
        <Text variant="caption" color={theme.textTertiary}>
          Значение находится вне диапазона ползунка. Передвиньте его, чтобы применить допустимое значение.
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
      <TextInput
        value={draft}
        onChangeText={(next) => {
          setDraft(next);
          if (isHexColor(next)) onChange(next);
        }}
        onEndEditing={() => {
          if (!isHexColor(draft)) setDraft(value);
        }}
        placeholder="#FFAE00"
        placeholderTextColor={theme.textTertiary}
        accessibilityLabel={setting.label}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        style={[
          styles.colorInput,
          {
            backgroundColor: theme.surfaceSunken,
            borderColor: theme.surfaceDivider,
            color: theme.textPrimary,
          },
        ]}
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
          <Text variant="caption" color={theme.textTertiary}>
            {parameterCountLabel(settings.length)}
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

export function FieldConfigExplorer(): ReactElement {
  const theme = useThemeColors();
  const config = useFieldConfig();
  const patchOverrides = useFieldConfigStore((state) => state.patchOverrides);
  const reset = useFieldConfigStore((state) => state.reset);
  const [query, setQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    () => new Set(['grid', 'objectGlow']),
  );
  const [collapsedSearchGroups, setCollapsedSearchGroups] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

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

  const visibleSettingCount = visibleGroups.reduce((sum, item) => sum + item.settings.length, 0);

  const onChangeSetting = (setting: FieldConfigSetting, value: unknown): void => {
    patchOverrides(buildFieldConfigSettingPatch(config, setting.path, value));

    // Camera optics and pose are mirrored in a runtime store while the 3D scene
    // is mounted, so update it too instead of waiting for the next scene mount.
    if (!setting.path.startsWith('camera.')) return;
    const cameraConfig = getFieldConfig().camera;
    const cameraControls = useFieldCameraControlStore.getState();

    if (setting.path.startsWith('camera.position.')) {
      cameraControls.setPosition(cameraConfig.position);
    } else if (setting.path.startsWith('camera.rotationDeg.')) {
      cameraControls.setRotationDeg(cameraConfig.rotationDeg);
    } else if (
      setting.path === 'camera.fov' ||
      setting.path === 'camera.near' ||
      setting.path === 'camera.far'
    ) {
      cameraControls.setProjection({
        fov: cameraConfig.fov,
        near: cameraConfig.near,
        far: cameraConfig.far,
      });
    }
  };

  const resetAll = (): void => {
    reset();
    const cameraConfig = getFieldConfig().camera;
    const cameraControls = useFieldCameraControlStore.getState();
    cameraControls.setPosition(cameraConfig.position);
    cameraControls.setRotationDeg(cameraConfig.rotationDeg);
    cameraControls.setProjection({
      fov: cameraConfig.fov,
      near: cameraConfig.near,
      far: cameraConfig.far,
    });
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
      <View
        style={[
          styles.search,
          { backgroundColor: theme.surfaceSunken, borderColor: theme.surfaceDivider },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск параметров по названию или описанию"
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel="Поиск параметров конфигурации поля"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: theme.textPrimary }]}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск параметров"
            hitSlop={layout.hitSlop}
            onPress={() => setQuery('')}
          >
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.resultHeader}>
        <Text variant="caption" color={theme.textSecondary}>
          {needle.length > 0
            ? `Найдено параметров: ${visibleSettingCount}`
            : `Все параметры конфигурации: ${FIELD_CONFIG_SETTING_GROUPS.reduce((sum, group) => sum + group.settings.length, 0)}`}
        </Text>
        <Button label="Сбросить конфиг" variant="secondary" onPress={resetAll} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  explorer: {
    gap: spacing.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.controlHeightCompact,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
  colorInput: {
    ...typography.body,
    minHeight: layout.controlHeightCompact,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
