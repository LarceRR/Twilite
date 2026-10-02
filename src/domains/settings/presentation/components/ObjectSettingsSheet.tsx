import { Canvas } from '@react-three/fiber/native';
import { type ReactElement, useMemo, useRef } from 'react';
import { Platform, Modal as RNModal, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/design-system/colors/colors';
import { ColorSwatches } from '@/design-system/components/ColorSwatches/ColorSwatches';
import { Divider } from '@/design-system/components/Divider/Divider';
import { IconButton } from '@/design-system/components/IconButton/IconButton';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Modal } from '@/design-system/components/Modal/Modal';
import { Slider } from '@/design-system/components/Slider/Slider';
import { Switch } from '@/design-system/components/Switch/Switch';
import { Text } from '@/design-system/components/Text/Text';
import { icons } from '@/design-system/icons/icons';
import { layout, spacing } from '@/design-system/spacing/spacing';
import type { SurfaceObjectKind } from '@/domains/surface-objects/domain/value-objects/SurfaceObjectKind';
import { patchExpoGlPixelStorei } from '@/scene/gl/patchExpoGlPixelStorei';
import {
  type ObjectPreviewComponent,
  type SettingsField,
  surfaceObjectDefinition,
  type SurfaceObjectDefinition,
} from '@/scene/objects';

export type ObjectSettingsSheetProps = {
  readonly kind: SurfaceObjectKind | null;
  readonly visible: boolean;
  readonly onClose: () => void;
};
const DRAG_SENSITIVITY = 0.01;
function formatValue(value: number, step: number): string {
  if (step >= 1) return String(Math.round(value));
  return value.toFixed(step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3);
}
function PreviewStage({ Preview }: { readonly Preview: ObjectPreviewComponent }): ReactElement {
  const yawRef = useRef(0);
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onChange((event) => {
          yawRef.current -= event.changeX * DRAG_SENSITIVITY;
        }),
    [],
  );
  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false} style={styles.stage}>
        <Canvas
          camera={{ fov: 45, near: 0.1, far: 50, position: [0, 0.72, 1.9] }}
          gl={{ antialias: true }}
          onCreated={({ gl }) => {
            patchExpoGlPixelStorei(gl.getContext());
          }}
          style={styles.canvas}
        >
          <Preview yawRef={yawRef} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
function FieldRow({ definition, field }: FieldRowProps): ReactElement {
  const value = definition.useSettingValue(field.path);
  if (field.kind === 'color')
    return (
      <View style={styles.field}>
        <Text variant="body">{field.label}</Text>
        <ColorSwatches
          accessibilityLabel={field.label}
          value={typeof value === 'string' ? value : '#FFFFFF'}
          onChange={(next) => definition.setSettingValue(field.path, next)}
        />
      </View>
    );
  if (field.kind === 'switch')
    return (
      <ListRow
        title={field.label}
        trailing={
          <Switch
            accessibilityLabel={field.label}
            value={value === true}
            onValueChange={(next) => definition.setSettingValue(field.path, next)}
          />
        }
      />
    );
  const numeric = typeof value === 'number' ? value : field.min;
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text variant="body">{field.label}</Text>
        <Text variant="caption">{formatValue(numeric, field.step)}</Text>
      </View>
      <Slider
        accessibilityLabel={field.label}
        min={field.min}
        max={field.max}
        step={field.step}
        value={numeric}
        onChange={(next) => definition.setSettingValue(field.path, next)}
      />
    </View>
  );
}
function SheetBody({
  definition,
  fill,
}: {
  readonly definition: SurfaceObjectDefinition;
  readonly fill: boolean;
}): ReactElement {
  return (
    <>
      <PreviewStage Preview={definition.Preview} />
      <ScrollView
        style={[styles.fields, fill ? styles.fieldsFill : styles.fieldsSheet]}
        contentContainerStyle={styles.fieldsContent}
        showsVerticalScrollIndicator={false}
      >
        {definition.settingsSchema.map((group) => (
          <View key={group.id} style={styles.group}>
            <Text variant="sectionTitle">{group.title}</Text>
            {group.fields.map((field) => (
              <FieldRow key={field.path} definition={definition} field={field} />
            ))}
          </View>
        ))}
        <Divider />
        <ListRow
          title="Сбросить настройки"
          subtitle="Вернуть значения по умолчанию"
          icon={icons.reset}
          onPress={definition.resetSettings}
        />
      </ScrollView>
    </>
  );
}
export function ObjectSettingsSheet({
  kind,
  visible,
  onClose,
}: ObjectSettingsSheetProps): ReactElement | null {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const definition = kind === null ? null : surfaceObjectDefinition(kind);
  if (definition === null) return null;
  if (Platform.OS === 'android')
    return (
      <RNModal
        animationType="slide"
        visible={visible}
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View
          style={[
            styles.window,
            {
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom,
              backgroundColor: theme.surface,
            },
          ]}
        >
          <View style={styles.windowHeader}>
            <Text variant="sectionTitle" style={styles.windowTitle} numberOfLines={1}>
              {definition.settingsTitle}
            </Text>
            <IconButton icon={icons.close} accessibilityLabel="Закрыть" onPress={onClose} />
          </View>
          <SheetBody definition={definition} fill />
        </View>
      </RNModal>
    );
  return (
    <Modal visible={visible} onClose={onClose} title={definition.settingsTitle}>
      <SheetBody definition={definition} fill={false} />
    </Modal>
  );
}
type FieldRowProps = {
  readonly definition: SurfaceObjectDefinition;
  readonly field: SettingsField;
};
const styles = StyleSheet.create({
  stage: { height: 240, borderRadius: 20, overflow: 'hidden', backgroundColor: '#14100D' },
  canvas: { flex: 1 },
  fields: { marginTop: spacing.md },
  fieldsFill: { flex: 1 },
  fieldsSheet: { flexGrow: 0, maxHeight: 360 },
  fieldsContent: { gap: spacing.lg, paddingBottom: spacing.xl },
  group: { gap: spacing.sm },
  field: { gap: spacing.xxs, paddingVertical: spacing.xs },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  window: { flex: 1, paddingHorizontal: layout.screenGutter, gap: spacing.md },
  windowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  windowTitle: { flex: 1 },
});
