import { useFrame } from '@react-three/fiber/native';
import { memo, type ReactElement, useEffect, useMemo, useRef } from 'react';
import type { PointLight } from 'three';

import { sceneColors } from '@/design-system/colors/colors';
import { surfaceObjectMotion } from '@/design-system/motion/surface-objects';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import { knownKinds } from '@/domains/surface-objects/domain/value-objects/SurfaceObjectKind';
import { readPixelObjectId } from '@/shared/pixelObject/metadata';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import { useCameraStore } from '@/scene/stores/cameraStore';
import { useSceneStore } from '@/scene/stores/sceneStore';
import { cellToWorld, type WorldPoint } from '@/scene/surface/cellToWorld';
import { dampOverMs, shortestAngleDelta } from '@/shared/utils/math';

import { isLostInFog, objectFogFactor, viewDepth } from '../core/fogVisibility';
import { registerModelParticleSampler } from '../core/modelSampler';
import { objectYawFacingCamera } from '../core/objectFacing';
import { objectAnimationPlaying, objectOpacityTarget } from '../core/objectFocus';
import { objectYawRadians } from '../core/objectYaw';
import { selectVisibleObjects } from '../core/selectVisibleObjects';
import { VoxelFireEmitter } from './fireEmitter';
import { FIRE_LIGHT, fireLightIntensity } from './fireLight';
import type { FireParticleLayer } from './fireParticleLayer';
import { useFireSettingsStore } from './fireSettingsStore';
import { combineWind, MotionWind } from './motionWind';
import { FIRE_LAYER_CAPACITY, VoxelFireLayers } from './voxelFireLayers';

/** Longest frame the simulation will integrate, so a stall never blows the fire up. */
const MAX_FRAME_SECONDS = 0.05;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Every fire on the surface: two instanced layers of emissive voxels.
 *
 * Nothing here is loaded from disk: the fire is pure geometry + shader, tuned
 * live from the fire settings store. The glow is not drawn here either — the
 * particles simply emit above 1.0 and the HDR bloom pass turns that into light.
 * Objects that drift past the scene fog stop simulating entirely — they are
 * invisible anyway.
 */
function VoxelFireFieldComponent(): ReactElement {
  const tier = useSceneStore((state) => state.quality.tier);
  const settings = useFireSettingsStore((state) => state.settings);

  const lightRef = useRef<PointLight>(null);
  const emittersRef = useRef(new Map<string, VoxelFireEmitter>());
  const elapsedRef = useRef(0);
  const motionWindRef = useRef(new MotionWind());
  // Reused every frame: allocating a wind object per fire would be garbage for
  // no reason.
  const windRef = useRef({ strength: 0, direction: 0, minHeight: 0, maxHeight: 0 });

  const layers = useMemo(() => new VoxelFireLayers(FIRE_LAYER_CAPACITY[tier]), [tier]);

  useEffect(() => {
    const emitters = emittersRef.current;

    return () => {
      emitters.clear();
      layers.dispose();
    };
  }, [layers]);

  useEffect(() => {
    layers.applyUniforms(settings);
  }, [layers, settings]);

  /**
   * Hand the live particle cloud to whoever needs to measure this fire on
   * screen. Nobody else can: the particles exist only in these emitters.
   */
  useEffect(
    () =>
      registerModelParticleSampler((id, visit) => {
        const emitter = emittersRef.current.get(id);

        if (emitter === undefined) {
          return false;
        }

        const object = useSurfaceObjectsStore.getState().byId[id];

        if (object === undefined) {
          return false;
        }

        const { worldScale } = useFireSettingsStore.getState().settings;
        const origin = cellToWorld(object.cell);
        const cos = Math.cos(emitter.yaw);
        const sin = Math.sin(emitter.yaw);

        const emit = (layer: FireParticleLayer): void => {
          layer.forEach((x, y, z, scale) => {
            const localX = x * cos + z * sin;
            const localZ = -x * sin + z * cos;

            visit(
              origin.x + localX * worldScale,
              origin.y + y * worldScale,
              origin.z + localZ * worldScale,
              scale * worldScale,
            );
          });
        };

        emit(emitter.ember);
        emit(emitter.flame);

        return true;
      }),
    [],
  );

  useFrame((_, delta) => {
    const fire = useFireSettingsStore.getState().settings;
    const reduceMotion = useSettingsStore.getState().reduceMotion;
    const { orbit } = useCameraStore.getState();
    const { byId, order, spawningId, selectedId } = useSurfaceObjectsStore.getState();
    const maxInstances = useSceneStore.getState().quality.maxInstancesPerKind;

    const candidates = order.flatMap((id) => {
      const object = byId[id];

      if (object === undefined) {
        return [];
      }

      if (readPixelObjectId(object.metadata) !== null) {
        return [];
      }

      return [{ id: object.id, cell: object.cell, kind: object.kind, inFrustum: true }];
    });

    const visible = selectVisibleObjects({
      objects: candidates,
      kind: knownKinds.fire,
      spawningId,
      maxInstances,
      target: orbit.target,
      cellToWorld,
      viewDepth: (world) => {
        const position = { x: world.x, y: 0, z: world.z };

        return isLostInFog(objectFogFactor(position, orbit)) ? null : viewDepth(position, orbit);
      },
    });

    const simDelta = Math.min(delta, MAX_FRAME_SECONDS) * fire.globalSpeed;
    const dimOthers = selectedId !== null || spawningId !== null;
    const emitters = emittersRef.current;
    const alive = new Set<string>();
    let focusWorld: WorldPoint | null = null;

    // Dragging the surface is the only wind the app has: the gust follows how
    // fast the camera target is travelling, and dies down when it stops.
    const gust = combineWind(fire.wind, motionWindRef.current.sample(orbit.target, delta));
    const wind = windRef.current;
    wind.strength = gust.strength;
    wind.minHeight = fire.wind.minHeight;
    wind.maxHeight = fire.wind.maxHeight;

    // The selected fire turns to meet the camera; everything else relaxes back to
    // the pose it holds on the surface.
    const viewYaw = objectYawFacingCamera(orbit.azimuth);
    const { rotateMs } = surfaceObjectMotion.inspect;

    layers.begin();

    for (const item of visible) {
      alive.add(item.id);

      const world = cellToWorld(item.cell);
      const isFocused = item.id === selectedId || item.id === spawningId;
      const restYaw = objectYawRadians(item.id);

      let emitter = emitters.get(item.id);

      if (emitter === undefined) {
        emitter = new VoxelFireEmitter(fire, isFocused);
        emitter.yaw = restYaw;
        emitters.set(item.id, emitter);
      }

      const fog = objectFogFactor(world, orbit);
      const playing = objectAnimationPlaying({ fogFactor: fog, reduceMotion });
      const target = objectOpacityTarget(isFocused, dimOthers) * (1 - fog);
      const targetYaw = item.id === selectedId ? viewYaw : restYaw;

      emitter.opacity = dampOverMs(emitter.opacity, target, surfaceObjectMotion.dim.fadeMs, delta);

      // Damped along the short arc: the turn lasts about as long as the zoom, and
      // interrupting it mid-way (tapping another fire) never spins the long way
      // round.
      emitter.yaw = reduceMotion
        ? targetYaw
        : emitter.yaw + dampOverMs(0, shortestAngleDelta(emitter.yaw, targetYaw), rotateMs, delta);

      // Particles live in the emitter's own frame, which the renderer then spins
      // by `yaw`. Adding the yaw here keeps the gust pointing the same way in the
      // world no matter how the fire is turned.
      wind.direction = (gust.directionRad + emitter.yaw) * RAD_TO_DEG;

      emitter.configure(fire, isFocused);
      emitter.update(playing ? simDelta : 0, fire, wind);

      layers.write(emitter, world, fire, emitter.yaw);

      if (isFocused) {
        focusWorld = world;
      }
    }

    for (const id of [...emitters.keys()]) {
      if (!alive.has(id)) {
        emitters.delete(id);
      }
    }

    layers.commit();

    elapsedRef.current += delta;
    const light = lightRef.current;

    if (light !== null) {
      light.visible = focusWorld !== null && !reduceMotion;

      if (focusWorld !== null) {
        light.position.set(focusWorld.x, fire.worldScale * 1.2, focusWorld.z);
        light.intensity = fireLightIntensity(elapsedRef.current);
      }
    }
  });

  return (
    <>
      <primitive object={layers.emberMesh} />
      <primitive object={layers.flameMesh} />
      <pointLight
        ref={lightRef}
        color={sceneColors.fireLight}
        distance={FIRE_LIGHT.distance}
        decay={FIRE_LIGHT.decay}
        intensity={0}
        visible={false}
      />
    </>
  );
}

export const VoxelFireField = memo(VoxelFireFieldComponent);
