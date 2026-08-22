import { type ReactElement, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { floatingChromeBottomInset } from '@/app/navigation/tabBarLayout';
import { useServices } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import { useThemeColors } from '@/design-system/colors/colors';
import { FloatingAddButton } from '@/design-system/components/FloatingAddButton/FloatingAddButton';
import { Text } from '@/design-system/components/Text/Text';
import { icons } from '@/design-system/icons/icons';
import { surfaceObjectMotion } from '@/design-system/motion/surface-objects';
import { layout, spacing } from '@/design-system/spacing/spacing';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import type { SurfaceObjectKind } from '@/domains/surface-objects/domain/value-objects/SurfaceObjectKind';
import { useSurfaceObjectActions } from '@/domains/surface-objects/presentation/hooks/useSurfaceObjectActions';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import { useSurface } from '@/domains/surfaces/presentation/hooks/useSurface';
import { selectIsSyncing, useRealtimeStore } from '@/infrastructure/realtime/realtimeStore';
import { useRealtimeSync } from '@/infrastructure/realtime/useRealtimeSync';
import { TOP_CHROME_HEIGHT } from '@/scene/camera/freeZone';
import { SceneView } from '@/scene/SceneView';
import { useCameraStore } from '@/scene/stores/cameraStore';
import { useInspectStore } from '@/scene/stores/inspectStore';
import { selectFps, useSceneStore } from '@/scene/stores/sceneStore';
import { DebugInfo } from '@/scene/systems/DebugInfo';
import { presentableKinds } from '@/scene/surface-objects/kindPresentation';
import { hasPermission } from '../../domain/services/permissionService';
import { AddObjectMenu, type AddObjectOption } from '../components/AddObjectMenu';
import { CreateObjectSheet } from '../components/CreateObjectSheet';
import { HitboxOverlay } from '../components/HitboxOverlay';
import { MemberAvatars } from '../components/MemberAvatars';
import { ObjectDetailsSheet } from '../components/ObjectDetailsSheet';
import { useSpaces } from '../hooks/useSpaces';
const ADD_BUTTON_SIZE = 64;
export function SpaceScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const { logger } = useServices();
  const { activeSpace, isLoading: spacesLoading } = useSpaces();
  const spaceId = activeSpace?.id ?? null;
  const { surface, isLoading: surfaceLoading } = useSurface(spaceId);
  const actions = useSurfaceObjectActions(spaceId);
  useRealtimeSync(spaceId);
  const currentUserId = useAuthStore((s) => s.session?.userId ?? null);
  const selectedId = useSurfaceObjectsStore((s) => s.selectedId);
  const selected = useSurfaceObjectsStore((s) =>
    s.selectedId === null ? null : (s.byId[s.selectedId] ?? null),
  );
  const select = useSurfaceObjectsStore((s) => s.select);
  const endInspect = useCameraStore((s) => s.endInspect);
  const clearHitbox = useInspectStore((s) => s.clearHitbox);
  const sheet = useUiStore((s) => s.sheet);
  const openSheet = useUiStore((s) => s.openSheet);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const isSyncing = useRealtimeStore(selectIsSyncing);
  const showOverlay = useSettingsStore((s) => s.showPerformanceOverlay);
  const fps = useSceneStore(selectFps);
  const [note, setNote] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const canCreate =
    activeSpace !== null &&
    currentUserId !== null &&
    hasPermission(activeSpace, currentUserId, 'surfaceObject.create');
  const addOptions = useMemo<readonly AddObjectOption[]>(
    () =>
      presentableKinds().map((p) => ({
        kind: p.kind,
        label: p.createLabel,
        icon: p.icon,
        tint: p.tint,
      })),
    [],
  );
  const startCreate = useCallback(
    (kind: SurfaceObjectKind) => {
      setMenuOpen(false);
      setNote('');
      openSheet({ type: 'createObject', kind });
    },
    [openSheet],
  );
  const confirmCreate = useCallback(() => {
    if (sheet.type !== 'createObject') return;
    actions.create(sheet.kind, note.trim());
    closeSheet();
  }, [actions, closeSheet, note, sheet]);
  const dismissDetails = useCallback(() => {
    select(null);
    clearHitbox();
    endInspect();
  }, [clearHitbox, endInspect, select]);
  const isBusy = spacesLoading || (surfaceLoading && surface === null);
  const dockBottom = floatingChromeBottomInset(insets.bottom);
  return (
    <View style={[styles.root, { backgroundColor: theme.surface }]}>
      <View style={styles.scene}>
        <SceneView bounds={surface?.bounds ?? null} logger={logger} spaceKey={spaceId} />
      </View>
      <HitboxOverlay />
      <DebugInfo />
      {menuOpen ? (
        <Pressable
          accessibilityLabel="Закрыть меню добавления"
          style={StyleSheet.absoluteFill}
          onPress={() => setMenuOpen(false)}
        />
      ) : null}
      <View
        pointerEvents="box-none"
        style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}
      >
        <View pointerEvents="none" style={styles.topSlot}>
          {showOverlay ? <Text variant="caption">{`${fps} fps`}</Text> : null}
          {isSyncing ? <Text variant="caption">Синхронизация</Text> : null}
        </View>
        <View pointerEvents="box-none" style={styles.topRight}>
          <MemberAvatars space={activeSpace} currentUserId={currentUserId} />
        </View>
      </View>
      <View
        pointerEvents="box-none"
        style={[
          styles.addDock,
          {
            bottom: Math.max(insets.bottom, spacing.sm) + 4,
            right: spacing.sm,
          },
        ]}
      >
        <FloatingAddButton
          accessibilityLabel={menuOpen ? 'Закрыть меню добавления' : 'Добавить объект'}
          expanded={menuOpen}
          disabled={!canCreate || actions.isCreating}
          size={ADD_BUTTON_SIZE}
          onPress={() => setMenuOpen((o) => !o)}
        />
      </View>
      {menuOpen ? (
        <AddObjectMenu
          options={addOptions}
          onSelect={startCreate}
          bottom={dockBottom + ADD_BUTTON_SIZE + spacing.sm}
        />
      ) : null}
      {isBusy ? (
        <View pointerEvents="none" style={styles.loader}>
          <ActivityIndicator color={theme.textSecondary} size="large" />
        </View>
      ) : null}
      {!canCreate && activeSpace !== null ? (
        <View
          pointerEvents="none"
          style={[styles.notice, { bottom: dockBottom + ADD_BUTTON_SIZE + spacing.md }]}
        >
          <Text variant="caption" align="center">
            У вас нет прав добавлять объекты в это пространство
          </Text>
        </View>
      ) : null}
      <CreateObjectSheet
        visible={sheet.type === 'createObject'}
        kind={sheet.type === 'createObject' ? sheet.kind : null}
        note={note}
        onChangeNote={setNote}
        onConfirm={confirmCreate}
        onClose={closeSheet}
      />
      <ObjectDetailsSheet
        object={selected}
        visible={selectedId !== null}
        icon={icons.favorite}
        heightFraction={surfaceObjectMotion.inspect.sheetScreenFraction}
        onClose={dismissDetails}
        onToggleFavorite={actions.toggleFavorite}
        onDelete={(object) => {
          actions.remove(object);
          dismissDetails();
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  scene: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  topSlot: {
    flex: 1,
    minHeight: TOP_CHROME_HEIGHT,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  topRight: {
    minHeight: TOP_CHROME_HEIGHT,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addDock: { position: 'absolute', alignItems: 'center' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
  },
});
