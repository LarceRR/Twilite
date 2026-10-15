import Slider from '@react-native-community/slider';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useState, type ReactElement } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

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
import { createRoundedSquarePlatformUvPng } from '@/domains/spaces/presentation/field/fieldUvPng';
import {
  hydrateFieldTileTextureUri,
  persistFieldTileTextureUri,
} from '@/domains/spaces/presentation/field/fieldTileTexture';
import { useFieldConfig } from '@/domains/spaces/presentation/field/useFieldConfig';

export function DeveloperSceneTilesSettingsScreen(): ReactElement {
  const theme = useThemeColors();
  const settings = useFieldTileStore();
  const setOption = settings.setOption;
  const fieldConfig = useFieldConfig();
  const [seedDraft, setSeedDraft] = useState(settings.worldSeed);
  const [textureBusy, setTextureBusy] = useState(false);

  useEffect(() => {
    setSeedDraft(settings.worldSeed);
  }, [settings.worldSeed]);

  useEffect(() => {
    void hydrateFieldTileTextureUri();
  }, []);

  const addTexture = async (): Promise<void> => {
    setTextureBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset === undefined) return;

      const name = asset.name.toLowerCase();
      const isPng = asset.mimeType === 'image/png' || name.endsWith('.png');
      const isJpeg =
        asset.mimeType === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
      if (!isPng && !isJpeg) {
        Alert.alert('Неподдерживаемый файл', 'Выберите изображение PNG или JPG.');
        return;
      }

      const directory = FileSystem.documentDirectory;
      if (directory === null) {
        throw new Error('Не удалось получить каталог приложения для текстур.');
      }
      const extension = isPng ? 'png' : 'jpg';
      const destination =
        directory + 'twilite-field-tile-' + Date.now().toString() + '.' + extension;
      await FileSystem.copyAsync({ from: asset.uri, to: destination });
      await persistFieldTileTextureUri(destination);
    } catch (error) {
      console.error('Не удалось загрузить текстуру плитки', error);
      Alert.alert('Не удалось загрузить текстуру', 'Попробуйте выбрать PNG или JPG ещё раз.');
    } finally {
      setTextureBusy(false);
    }
  };

  const removeTexture = async (): Promise<void> => {
    const previousUri = settings.textureUri;
    try {
      await persistFieldTileTextureUri(null);
      if (
        previousUri !== null &&
        FileSystem.documentDirectory !== null &&
        previousUri.startsWith(FileSystem.documentDirectory)
      ) {
        await FileSystem.deleteAsync(previousUri, { idempotent: true });
      }
    } catch (error) {
      console.error('Не удалось удалить текстуру плитки', error);
      Alert.alert('Не удалось удалить текстуру', 'Попробуйте ещё раз.');
    }
  };

  const exportUv = async (): Promise<void> => {
    setTextureBusy(true);
    try {
      const png = createRoundedSquarePlatformUvPng(
        fieldConfig.grid.cellSizePx,
        fieldConfig.platform.height,
        fieldConfig.platform.cornerRadius,
        fieldConfig.platform.edgeBevel,
      );
      // Same pattern as the config export: write to the cache, then share it.
      const file = new File(Paths.cache, 'twilite-field-tile-uv-' + Date.now().toString() + '.png');
      file.create();
      await file.write(png);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          'UV-развёртка создана',
          'Файл записан, но системное меню сохранения недоступно на этом устройстве.',
        );
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Сохранить UV-развёртку плитки',
      });
    } catch (error) {
      console.error('Не удалось экспортировать UV-развёртку плитки', error);
      Alert.alert('Не удалось скачать UV-развёртку', 'Попробуйте ещё раз.');
    } finally {
      setTextureBusy(false);
    }
  };

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

      <BlurCard title="Общая геометрия">
        <Text variant="caption">
          Все ячейки используют один тип плитки. Толщина задаётся настройкой геометрии
          ({fieldConfig.platform.height} единиц) и не зависит от высоты расположения.
          Меняется только положение верхней грани.
        </Text>
        <NumberSetting
          title="Обычные ячейки: минимум"
          value={settings.tileMinHeight}
          min={0}
          max={3}
          onValueChange={(value) =>
            setOption('tileMinHeight', Math.min(value, settings.tileMaxHeight))
          }
        />
        <NumberSetting
          title="Обычные ячейки: максимум"
          value={settings.tileMaxHeight}
          min={0}
          max={3}
          onValueChange={(value) =>
            setOption('tileMaxHeight', Math.max(value, settings.tileMinHeight))
          }
        />
        <NumberSetting
          title="Ячейки с объектами: минимум"
          value={settings.objectMinHeight}
          min={Math.min(24, Math.max(4, settings.tileMaxHeight * 2 + 1))}
          max={24}
          onValueChange={(value) =>
            setOption('objectMinHeight', Math.min(value, settings.objectMaxHeight))
          }
        />
        <NumberSetting
          title="Ячейки с объектами: максимум"
          value={settings.objectMaxHeight}
          min={settings.objectMinHeight}
          max={24}
          onValueChange={(value) =>
            setOption('objectMaxHeight', Math.max(value, settings.objectMinHeight))
          }
        />
      </BlurCard>

      <BlurCard title="Текстура плитки">
        <Text variant="caption">
          Выбранное изображение будет использоваться всеми плитками, в том числе под объектами.
          Поддерживаются PNG и JPG.
        </Text>
        <Button
          label={
            textureBusy
              ? 'Подготовка…'
              : settings.textureUri === null
                ? 'Добавить текстуру'
                : 'Заменить текстуру'
          }
          onPress={() => void addTexture()}
        />
        {settings.textureUri !== null ? (
          <>
            <Text variant="caption">Пользовательская текстура выбрана.</Text>
            <Button label="Убрать текстуру" onPress={() => void removeTexture()} />
          </>
        ) : null}
        <Button
          label={textureBusy ? 'Подготовка…' : 'Скачать UV-развёртку плитки'}
          onPress={() => void exportUv()}
        />
        <Text variant="caption">
          Развёртка строится по UV-координатам той же геометрии, что используется в сцене:
          {' '}{fieldConfig.grid.cellSizePx}×{fieldConfig.grid.cellSizePx}, толщина{' '}
          {fieldConfig.platform.height}. Файл в PNG: его можно сохранить в фото, отправить в
          Telegram, нарисовать поверх и загрузить обратно как текстуру.
        </Text>
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
