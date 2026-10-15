import Slider from '@react-native-community/slider';
import { useState, type ReactElement } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Switch } from '@/design-system/components/Switch/Switch';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';

import { useFieldMaterialStore } from './fieldMaterialStore';
import type { FieldMaterialPreferences } from './fieldMaterialStore';

type NumericKey = {
  [K in keyof FieldMaterialPreferences]: FieldMaterialPreferences[K] extends number ? K : never;
}[keyof FieldMaterialPreferences];

export function FieldDevMaterialOverlay(): ReactElement {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const [expanded, setExpanded] = useState(true);
  const [seedDraft, setSeedDraft] = useState(useFieldMaterialStore.getState().worldSeed);
  const [tintDraft, setTintDraft] = useState(useFieldMaterialStore.getState().tintHex);
  const [emissiveDraft, setEmissiveDraft] = useState(useFieldMaterialStore.getState().emissiveHex);
  const setOption = useFieldMaterialStore((state) => state.setOption);
  const fieldConfig = useFieldConfig();
  const setFieldSection = useFieldConfigStore((state) => state.setSection);
  const worldSeed = useFieldMaterialStore((state) => state.worldSeed);
  const settings = useFieldMaterialStore();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        pointerEvents="auto"
        style={[
          styles.panel,
          {
            top: insets.top + spacing.sm,
            borderColor: theme.surfaceDivider,
            maxHeight: '62%',
          },
        ]}
      >
        <BlurCard>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            style={styles.header}
          >
            <View style={styles.headerCopy}>
              <Text variant="sectionTitle">Материалы сцены</Text>
              <Text variant="caption">
                {settings.assetName || 'Материал темы'} · Live preview
              </Text>
            </View>
            <Text variant="caption">{expanded ? 'Свернуть' : 'Настроить'}</Text>
          </Pressable>
          {expanded ? (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              style={styles.controls}
              contentContainerStyle={styles.controlsContent}
            >
              <Text variant="sectionTitle">Текстура</Text>
              <MaterialSlider label="Tiling X" settingKey="tilingScaleX" min={0.01} max={2} step={0.01} value={settings.tilingScaleX} onChange={setOption} />
              <MaterialSlider label="Tiling Y" settingKey="tilingScaleY" min={0.01} max={2} step={0.01} value={settings.tilingScaleY} onChange={setOption} />
              <MaterialSlider label="Texture offset X" settingKey="textureOffsetX" min={-2} max={2} step={0.01} value={settings.textureOffsetX} onChange={setOption} />
              <MaterialSlider label="Texture offset Y" settingKey="textureOffsetY" min={-2} max={2} step={0.01} value={settings.textureOffsetY} onChange={setOption} />
              <MaterialSlider label="Texture rotation" settingKey="textureRotationDeg" min={-180} max={180} step={1} value={settings.textureRotationDeg} onChange={setOption} suffix="°" />
              <Text variant="caption">Tint HEX</Text>
              <View style={styles.inlineInput}>
                <TextInput
                  value={tintDraft}
                  onChangeText={setTintDraft}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="#FFFFFF"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, { color: theme.textPrimary, borderColor: theme.surfaceDivider }]}
                />
                <Button label="OK" onPress={() => setOption('tintHex', /^#[\da-f]{6}$/i.test(tintDraft) ? tintDraft : '#FFFFFF')} />
              </View>

              <Text variant="caption">Emissive HEX</Text>
              <View style={styles.inlineInput}>
                <TextInput
                  value={emissiveDraft}
                  onChangeText={setEmissiveDraft}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="#000000"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, { color: theme.textPrimary, borderColor: theme.surfaceDivider }]}
                />
                <Button label="OK" onPress={() => setOption('emissiveHex', /^#[\da-f]{6}$/i.test(emissiveDraft) ? emissiveDraft : '#000000')} />
              </View>

              <Text variant="sectionTitle">PBR</Text>
              <MaterialSlider label="Roughness" settingKey="roughness" min={0} max={1} step={0.01} value={settings.roughness} onChange={setOption} />
              <MaterialSlider label="Metalness" settingKey="metalness" min={0} max={1} step={0.01} value={settings.metalness} onChange={setOption} />
              <MaterialSlider label="Normal scale X" settingKey="normalScaleX" min={0} max={3} step={0.05} value={settings.normalScaleX} onChange={setOption} />
              <MaterialSlider label="Normal scale Y" settingKey="normalScaleY" min={0} max={3} step={0.05} value={settings.normalScaleY} onChange={setOption} />
              <MaterialSlider label="Bump scale" settingKey="bumpScale" min={0} max={2} step={0.01} value={settings.bumpScale} onChange={setOption} />
              <MaterialSlider label="Displacement scale" settingKey="displacementScale" min={-3} max={3} step={0.01} value={settings.displacementScale} onChange={setOption} />
              <MaterialSlider label="Displacement bias" settingKey="displacementBias" min={-2} max={2} step={0.01} value={settings.displacementBias} onChange={setOption} />
              <MaterialSlider label="Ambient occlusion" settingKey="aoMapIntensity" min={0} max={2} step={0.05} value={settings.aoMapIntensity} onChange={setOption} />
              <MaterialSlider label="Emissive intensity" settingKey="emissiveIntensity" min={0} max={5} step={0.05} value={settings.emissiveIntensity} onChange={setOption} />
              <MaterialSlider label="Opacity" settingKey="opacity" min={0} max={1} step={0.01} value={settings.opacity} onChange={setOption} />
              <MaterialSlider label="Alpha test" settingKey="alphaTest" min={0} max={1} step={0.01} value={settings.alphaTest} onChange={setOption} />
              <MaterialSlider label="Anisotropy" settingKey="anisotropy" min={1} max={16} step={1} value={settings.anisotropy} onChange={setOption} />

              <Text variant="sectionTitle">Состояние материала</Text>
              <MaterialToggle title="Transparent" value={settings.transparent} onChange={(value) => setOption('transparent', value)} />
              <MaterialToggle title="Double side" value={settings.doubleSide} onChange={(value) => setOption('doubleSide', value)} />
              <MaterialToggle title="Flat shading" value={settings.flatShading} onChange={(value) => setOption('flatShading', value)} />
              <MaterialToggle title="Wireframe" value={settings.wireframe} onChange={(value) => setOption('wireframe', value)} />
              <MaterialToggle title="Генерировать все плитки" value={settings.generatedTilesEnabled} onChange={(value) => setOption('generatedTilesEnabled', value)} />

              <Text variant="sectionTitle">Seed и высоты плиток</Text>
              <TextInput
                value={seedDraft}
                onChangeText={setSeedDraft}
                onSubmitEditing={() => setOption('worldSeed', seedDraft.trim() || 'twilite-world-001')}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="World seed"
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.surfaceDivider }]}
              />
              <View style={styles.seedRow}>
                <Text variant="caption">Текущий seed: {worldSeed}</Text>
                <Button label="Применить" onPress={() => setOption('worldSeed', seedDraft.trim() || 'twilite-world-001')} />
              </View>
              <MaterialSlider label="Inactive min height" settingKey="inactiveMinHeight" min={0} max={3} step={1} value={settings.inactiveMinHeight} onChange={setOption} />
              <MaterialSlider label="Inactive max height" settingKey="inactiveMaxHeight" min={settings.inactiveMinHeight} max={3} step={1} value={settings.inactiveMaxHeight} onChange={setOption} />
              <MaterialSlider label="Active min height" settingKey="activeMinHeight" min={1} max={settings.activeMaxHeight} step={1} value={settings.activeMinHeight} onChange={setOption} />
              <MaterialSlider label="Active max height" settingKey="activeMaxHeight" min={settings.activeMinHeight} max={24} step={1} value={settings.activeMaxHeight} onChange={setOption} />
              <StandaloneSlider
                label="Tile corner radius"
                value={fieldConfig.platform.cornerRadius}
                min={0}
                max={12}
                step={0.25}
                onChange={(value) => setFieldSection('platform', { ...fieldConfig.platform, cornerRadius: value })}
              />
              <StandaloneSlider
                label="Tile edge bevel"
                value={fieldConfig.platform.edgeBevel}
                min={0}
                max={6}
                step={0.1}
                onChange={(value) => setFieldSection('platform', { ...fieldConfig.platform, edgeBevel: value })}
              />
            </ScrollView>
          ) : null}
        </BlurCard>
      </View>
    </View>
  );
}

function MaterialSlider<K extends NumericKey>({
  label,
  settingKey,
  min,
  max,
  step,
  value,
  onChange,
  suffix = '',
}: {
  readonly label: string;
  readonly settingKey: K;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: FieldMaterialPreferences[K] & number;
  readonly onChange: <T extends keyof FieldMaterialPreferences>(key: T, value: FieldMaterialPreferences[T]) => void;
  readonly suffix?: string;
}): ReactElement {
  const theme = useThemeColors();
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderLabel}>
        <Text variant="caption">{label}</Text>
        <Text variant="caption">{Number(value.toFixed(2))}{suffix}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={(next) => onChange(settingKey, next as FieldMaterialPreferences[K])}
        minimumTrackTintColor={theme.accent}
        maximumTrackTintColor={theme.surfaceDivider}
        thumbTintColor={theme.accent}
      />
    </View>
  );
}

function StandaloneSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
}): ReactElement {
  const theme = useThemeColors();
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderLabel}>
        <Text variant="caption">{label}</Text>
        <Text variant="caption">{Number(value.toFixed(2))}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={theme.accent}
        maximumTrackTintColor={theme.surfaceDivider}
        thumbTintColor={theme.accent}
      />
    </View>
  );
}

function MaterialToggle({
  title,
  value,
  onChange,
}: {
  readonly title: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}): ReactElement {
  return (
    <View style={styles.toggleRow}>
      <Text variant="caption">{title}</Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    zIndex: 30,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  controls: {
    flexGrow: 0,
  },
  controlsContent: {
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  sliderRow: {
    paddingTop: spacing.xs,
  },
  sliderLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  inlineInput: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  seedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
