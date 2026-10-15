import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEffect, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Switch } from '@/design-system/components/Switch/Switch';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';

import { useSettingsStore } from '../stores/settingsStore';
import {
  type FieldMaterialAsset,
  downloadFieldMaterialAsset,
  searchFieldMaterialAssets,
} from '@/domains/spaces/presentation/field/fieldMaterialCatalog';
import {
  type FieldMaterialProvider,
  type FieldMaterialResolution,
  useFieldMaterialStore,
} from '@/domains/spaces/presentation/field/fieldMaterialStore';

const RESOLUTIONS: readonly FieldMaterialResolution[] = ['1K', '2K', '4K', '8K'];

export function DeveloperSceneMaterialsSettingsScreen(): ReactElement {
  const theme = useThemeColors();
  const provider = useFieldMaterialStore((state) => state.provider);
  const resolution = useFieldMaterialStore((state) => state.resolution);
  const selectedAssetId = useFieldMaterialStore((state) => state.assetId);
  const selectedAssetName = useFieldMaterialStore((state) => state.assetName);
  const maps = useFieldMaterialStore((state) => state.maps);
  const generatedTilesEnabled = useFieldMaterialStore((state) => state.generatedTilesEnabled);
  const worldSeed = useFieldMaterialStore((state) => state.worldSeed);
  const inactiveMinHeight = useFieldMaterialStore((state) => state.inactiveMinHeight);
  const inactiveMaxHeight = useFieldMaterialStore((state) => state.inactiveMaxHeight);
  const activeMinHeight = useFieldMaterialStore((state) => state.activeMinHeight);
  const activeMaxHeight = useFieldMaterialStore((state) => state.activeMaxHeight);
  const developerMaterialControlsEnabled = useSettingsStore((state) => state.developerMaterialControlsEnabled);
  const setDeveloperMaterialControlsEnabled = useSettingsStore((state) => state.setDeveloperMaterialControlsEnabled);
  const setOption = useFieldMaterialStore((state) => state.setOption);
  const useColorMap = useFieldMaterialStore((state) => state.useColorMap);
  const useNormalMap = useFieldMaterialStore((state) => state.useNormalMap);
  const useRoughnessMap = useFieldMaterialStore((state) => state.useRoughnessMap);
  const useMetalnessMap = useFieldMaterialStore((state) => state.useMetalnessMap);
  const useAoMap = useFieldMaterialStore((state) => state.useAoMap);
  const useBumpMap = useFieldMaterialStore((state) => state.useBumpMap);
  const useDisplacementMap = useFieldMaterialStore((state) => state.useDisplacementMap);
  const useEmissiveMap = useFieldMaterialStore((state) => state.useEmissiveMap);

  const [query, setQuery] = useState('stone');
  const [assets, setAssets] = useState<readonly FieldMaterialAsset[]>([]);
  const [searching, setSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seedDraft, setSeedDraft] = useState(worldSeed);

  useEffect(() => {
    let active = true;
    setSearching(true);
    setError(null);
    void searchFieldMaterialAssets(provider, 'stone')
      .then((items) => {
        if (active) setAssets(items);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить каталог материалов.');
      })
      .finally(() => {
        if (active) setSearching(false);
      });
    return () => {
      active = false;
    };
  }, [provider]);

  const runSearch = async (): Promise<void> => {
    setSearching(true);
    setError(null);
    try {
      setAssets(await searchFieldMaterialAssets(provider, query));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить каталог материалов.');
    } finally {
      setSearching(false);
    }
  };

  const downloadAndApply = async (asset: FieldMaterialAsset): Promise<void> => {
    setDownloadingId(asset.id);
    setError(null);
    try {
      const downloaded = await downloadFieldMaterialAsset(asset, resolution);
      if (Object.keys(downloaded.maps).length === 0) {
        throw new Error('В материале нет распознанных карт текстур.');
      }
      useFieldMaterialStore.getState().setDownloadedMaterial(
        { provider: asset.provider, id: asset.id, name: asset.name },
        resolution,
        downloaded.maps,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось скачать и применить материал.');
    } finally {
      setDownloadingId(null);
    }
  };

  const selectProvider = (value: FieldMaterialProvider): void => {
    setAssets([]);
    setError(null);
    setOption('provider', value);
  };

  return (
    <Screen title="Материалы сцены" reserveTabBar={false}>
      <BlurCard title="Предпросмотр в реальном времени">
        <Text variant="body">
          Включи панель поверх поля, чтобы менять параметры и сразу видеть их на платформе без перезапуска.
        </Text>
        <Switch
          value={developerMaterialControlsEnabled}
          onValueChange={setDeveloperMaterialControlsEnabled}
          accessibilityLabel="Настройки материалов сцены на поле"
        />
        <Text variant="caption">
          Текущий материал: {selectedAssetName || 'тема приложения (без загруженного PBR-материала)'}
        </Text>
      </BlurCard>

      <BlurCard title="Генерация мира">
        <SettingSwitch
          title="Плитки по всей поверхности"
          subtitle="Создаёт плитки во всех ячейках загружаемых чанков."
          value={generatedTilesEnabled}
          onValueChange={(value) => setOption('generatedTilesEnabled', value)}
        />
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
        <Button label="Применить seed" onPress={() => setOption('worldSeed', seedDraft.trim() || 'twilite-world-001')} />
        <Text variant="caption">
          Одинаковый seed и координаты дают одинаковые высоты плиток даже после прокрутки и повторной загрузки чанка.
        </Text>
        <NumberSetting
          title="Неактивные плитки: минимум"
          value={inactiveMinHeight}
          min={0}
          max={3}
          onValueChange={(value) => setOption('inactiveMinHeight', Math.min(value, inactiveMaxHeight))}
        />
        <NumberSetting
          title="Неактивные плитки: максимум"
          value={inactiveMaxHeight}
          min={0}
          max={3}
          onValueChange={(value) => setOption('inactiveMaxHeight', Math.max(value, inactiveMinHeight))}
        />
        <NumberSetting
          title="Активные плитки: минимум"
          value={activeMinHeight}
          min={1}
          max={24}
          onValueChange={(value) => setOption('activeMinHeight', Math.min(value, activeMaxHeight))}
        />
        <NumberSetting
          title="Активные плитки: максимум"
          value={activeMaxHeight}
          min={1}
          max={24}
          onValueChange={(value) => setOption('activeMaxHeight', Math.max(value, activeMinHeight))}
        />
      </BlurCard>

      <BlurCard title="Каталог PBR-материалов">
        <View style={styles.providerRow}>
          <ProviderButton
            title="ambientCG"
            active={provider === 'ambientCG'}
            onPress={() => selectProvider('ambientCG')}
          />
          <ProviderButton
            title="Poly Haven"
            active={provider === 'Poly Haven'}
            onPress={() => selectProvider('Poly Haven')}
          />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void runSearch()}
          returnKeyType="search"
          placeholder="Поиск: stone, concrete, tiles…"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.textPrimary, borderColor: theme.surfaceDivider }]}
        />
        <Button label={searching ? 'Загружаю каталог…' : 'Найти материалы'} onPress={() => void runSearch()} />
        <Text variant="caption">
          {provider === 'Poly Haven'
            ? 'Powered by Poly Haven · CC0. Каталог использует публичный API с обязательным указанием источника.'
            : 'ambientCG · CC0. Материалы можно использовать в коммерческих проектах.'}
        </Text>
        {error !== null ? (
          <Text variant="body">{error}</Text>
        ) : null}
        {searching ? <ActivityIndicator color={theme.accent} /> : null}
        {assets.map((asset) => (
          <View
            key={provider + ':' + asset.id}
            style={[styles.assetCard, { borderColor: theme.surfaceDivider }]}
          >
            {asset.previewUrl !== null ? (
              <Image source={{ uri: asset.previewUrl }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={[styles.preview, styles.previewPlaceholder, { backgroundColor: theme.surfaceSunken }]}>
                <Ionicons name="image-outline" size={28} color={theme.textSecondary} />
              </View>
            )}
            <View style={styles.assetInfo}>
              <Text variant="body">{asset.name}</Text>
              <Text variant="caption">{asset.category}</Text>
              {asset.description.length > 0 ? (
                <Text variant="caption" numberOfLines={2}>{asset.description}</Text>
              ) : null}
              <View style={styles.resolutionRow}>
                {RESOLUTIONS.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: resolution === value }}
                    onPress={() => setOption('resolution', value)}
                    style={[
                      styles.resolutionButton,
                      {
                        borderColor: resolution === value ? theme.accent : theme.surfaceDivider,
                        backgroundColor: resolution === value ? theme.accentSoft : 'transparent',
                      },
                    ]}
                  >
                    <Text variant="caption">{value}</Text>
                  </Pressable>
                ))}
              </View>
              <Button
                label={downloadingId === asset.id ? 'Скачиваю и применяю…' : selectedAssetId === asset.id && Object.keys(maps).length > 0 ? 'Применить снова' : 'Скачать и применить'}
                onPress={() => void downloadAndApply(asset)}
                disabled={downloadingId !== null}
              />
            </View>
          </View>
        ))}
        {!searching && assets.length === 0 && error === null ? (
          <Text variant="caption">Материалы не найдены. Измени запрос или выбери другой каталог.</Text>
        ) : null}
        <Text variant="caption">
          8K-карты могут занимать много памяти. Для первого предпросмотра на телефоне рекомендуются 1K–2K.
        </Text>
      </BlurCard>

      <BlurCard title="Карты материала">
        <Text variant="caption">
          Отключай карты по отдельности, чтобы быстро сравнить результат. Неподдерживаемые карты автоматически пропускаются.
        </Text>
        <SettingSwitch title="Color / Albedo" value={useColorMap} onValueChange={(value) => setOption('useColorMap', value)} />
        <SettingSwitch title="Normal" value={useNormalMap} onValueChange={(value) => setOption('useNormalMap', value)} />
        <SettingSwitch title="Roughness" value={useRoughnessMap} onValueChange={(value) => setOption('useRoughnessMap', value)} />
        <SettingSwitch title="Metalness" value={useMetalnessMap} onValueChange={(value) => setOption('useMetalnessMap', value)} />
        <SettingSwitch title="Ambient Occlusion" value={useAoMap} onValueChange={(value) => setOption('useAoMap', value)} />
        <SettingSwitch title="Bump" value={useBumpMap} onValueChange={(value) => setOption('useBumpMap', value)} />
        <SettingSwitch title="Displacement" value={useDisplacementMap} onValueChange={(value) => setOption('useDisplacementMap', value)} />
        <SettingSwitch title="Emissive" value={useEmissiveMap} onValueChange={(value) => setOption('useEmissiveMap', value)} />
      </BlurCard>
    </Screen>
  );
}

function SettingSwitch({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
}): ReactElement {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text variant="body">{title}</Text>
        {subtitle !== undefined ? <Text variant="caption">{subtitle}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={title} />
    </View>
  );
}

function ProviderButton({
  title,
  active,
  onPress,
}: {
  readonly title: string;
  readonly active: boolean;
  readonly onPress: () => void;
}): ReactElement {
  const theme = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.providerButton,
        {
          borderColor: active ? theme.accent : theme.surfaceDivider,
          backgroundColor: active ? theme.accentSoft : 'transparent',
        },
      ]}
    >
      <Text variant="body">{title}</Text>
    </Pressable>
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
      <View style={styles.numberTitle}>
        <Text variant="caption">{title}</Text>
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  providerButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  assetCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  preview: {
    width: 92,
    height: 92,
    borderRadius: 8,
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  resolutionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  resolutionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  numberSetting: {
    marginTop: spacing.sm,
  },
  numberTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
