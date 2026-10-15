import type { FieldConfig } from './fieldConfig';

/** Fixed GPU buffer capacity; the active count is configured in FieldConfig. */
export const FIREFLY_BUFFER_CAPACITY = 32;

export type FireflyConfig = FieldConfig['fireflies'];

export type FireflyEmitter = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly color: string;
  readonly intensity: number;
  readonly distance: number;
};

export type FireflyCluster = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly color: string;
  readonly intensity: number;
  readonly distance: number;
  readonly emitterCount: number;
};

export type FireflyKind = 'drifter' | 'wanderer' | 'scout';

export type Firefly = {
  readonly id: number;
  readonly seed: number;
  readonly kind: FireflyKind;
  readonly clusterId: string;
  readonly homeOffsetX: number;
  readonly homeOffsetY: number;
  readonly homeOffsetZ: number;
  readonly wanderRadius: number;
  readonly phase: number;
  readonly lifetimeSec: number;
  readonly baseIntensity: number;
  readonly light: {
    x: number;
    y: number;
    z: number;
    color: string;
    intensity: number;
    distance: number;
  };
  ageSec: number;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeY: number;
  homeZ: number;
  vx: number;
  vy: number;
  vz: number;
  retireInSec: number | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeDivisor(value: number): number {
  return Math.max(value, 0.0001);
}

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashText(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function clusterIdFor(emitters: readonly FireflyEmitter[]): string {
  return 'firefly-' + hashText(emitters.map((emitter) => emitter.id).sort().join('|')).toString(36);
}

function parseHexColor(value: string, fallbackColor: string): readonly [number, number, number] {
  const normalized = value.trim().replace(/^#/, '');
  const hex =
    normalized.length === 3
      ? normalized.split('').map((part) => part + part).join('')
      : normalized;
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    if (value !== fallbackColor) return parseHexColor(fallbackColor, fallbackColor);
    return [255, 174, 0];
  }
  const numeric = Number.parseInt(hex, 16);
  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];
}

function averageColor(
  emitters: readonly FireflyEmitter[],
  config: FireflyConfig,
): string {
  let red = 0;
  let green = 0;
  let blue = 0;
  let totalWeight = 0;

  for (const emitter of emitters) {
    const color = parseHexColor(emitter.color, config.fallbackColor);
    const weight = clamp(emitter.intensity, config.emitterWeightMin, config.emitterWeightMax);
    red += color[0] * weight;
    green += color[1] * weight;
    blue += color[2] * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return config.fallbackColor;
  const channel = (value: number) => clamp(Math.round(value / totalWeight), 0, 255)
    .toString(16).padStart(2, '0');
  return ('#' + channel(red) + channel(green) + channel(blue)).toUpperCase();
}

/**
 * Adjacent emitters form one cloud. An unlit object is never passed here, so it
 * cannot become a spawn anchor; nearby lit objects share one moving population.
 */
export function buildFireflyClusters(
  emitters: readonly FireflyEmitter[],
  cellSize: number,
  config: FireflyConfig,
): FireflyCluster[] {
  const valid = emitters
    .filter((emitter) =>
      Number.isFinite(emitter.x) &&
      Number.isFinite(emitter.y) &&
      Number.isFinite(emitter.z) &&
      Number.isFinite(emitter.intensity) &&
      emitter.intensity > 0,
    )
    .slice(0, config.clusterMaxEmitters);
  if (valid.length === 0) return [];

  const neighbourDistance = Math.max(
    config.minimumClusterNeighbourDistance,
    cellSize * config.clusterNeighbourDistanceMultiplier,
  );
  const neighbourDistanceSq = neighbourDistance * neighbourDistance;
  const visited = new Uint8Array(valid.length);
  const clusters: FireflyCluster[] = [];

  for (let start = 0; start < valid.length; start += 1) {
    if (visited[start] !== 0) continue;
    const queue = [start];
    const group: FireflyEmitter[] = [];
    visited[start] = 1;

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor]!;
      const emitter = valid[index]!;
      group.push(emitter);

      for (let candidate = 0; candidate < valid.length; candidate += 1) {
        if (visited[candidate] !== 0) continue;
        const other = valid[candidate]!;
        const dx = emitter.x - other.x;
        const dy = emitter.y - other.y;
        if (dx * dx + dy * dy > neighbourDistanceSq) continue;
        visited[candidate] = 1;
        queue.push(candidate);
      }
    }

    let weightedX = 0;
    let weightedY = 0;
    let weightedZ = 0;
    let totalWeight = 0;
    let intensity = 0;
    let distance = 0;
    for (const emitter of group) {
      const weight = clamp(emitter.intensity, config.emitterWeightMin, config.emitterWeightMax);
      weightedX += emitter.x * weight;
      weightedY += emitter.y * weight;
      weightedZ += emitter.z * weight;
      totalWeight += weight;
      intensity += emitter.intensity;
      distance = Math.max(distance, emitter.distance);
    }

    const x = weightedX / totalWeight;
    const y = weightedY / totalWeight;
    const z = weightedZ / totalWeight;
    const spread = group.reduce((max, emitter) => {
      const dx = emitter.x - x;
      const dy = emitter.y - y;
      return Math.max(max, Math.hypot(dx, dy));
    }, 0);

    clusters.push({
      id: clusterIdFor(group),
      x,
      y,
      z,
      radius: clamp(
        spread + cellSize * config.clusterRadiusOffsetCellMultiplier,
        cellSize * config.clusterRadiusMinCellMultiplier,
        cellSize * config.clusterRadiusMaxCellMultiplier,
      ),
      color: averageColor(group, config),
      intensity: clamp(
        intensity / group.length,
        config.clusterIntensityMin,
        config.clusterIntensityMax,
      ),
      distance: clamp(
        distance,
        cellSize * config.clusterDistanceMinCellMultiplier,
        cellSize * config.clusterDistanceMaxCellMultiplier,
      ),
      emitterCount: group.length,
    });
  }

  return clusters;
}

export function fireflyTargetCount(cluster: FireflyCluster, config: FireflyConfig): number {
  return clamp(
    config.targetBaseCount + Math.round(cluster.emitterCount * config.targetPerEmitter),
    config.targetMinCount,
    config.targetMaxCount,
  );
}

export function createFirefly(
  id: number,
  cluster: FireflyCluster,
  cellSize: number,
  config: FireflyConfig,
): Firefly {
  const seed = (Math.imul(id + 1, 0x9e3779b1) ^ hashText(cluster.id)) >>> 0;
  const random = makeRandom(seed);
  const kindRoll = random();
  const kind: FireflyKind =
    kindRoll < config.scoutChance
      ? 'scout'
      : kindRoll < config.scoutChance + config.wandererChance
        ? 'wanderer'
        : 'drifter';
  const kindConfig = config.kinds[kind];
  const angle = random() * Math.PI * 2;
  const radialDistance = Math.sqrt(random()) * cluster.radius;
  const homeOffsetX = Math.cos(angle) * radialDistance;
  const homeOffsetY = Math.sin(angle) * radialDistance;
  const homeOffsetZ =
    config.spawnHeightMin +
    random() * Math.min(config.spawnHeightRange, cellSize * config.spawnHeightCellMultiplier);
  const homeX = cluster.x + homeOffsetX;
  const homeY = cluster.y + homeOffsetY;
  const homeZ = cluster.z + homeOffsetZ;
  const baseIntensity =
    kindConfig.baseIntensity *
    clamp(
      cluster.intensity / config.intensityScaleDivisor,
      config.intensityMultiplierMin,
      config.intensityMultiplierMax,
    );
  const lifetimeSec = Math.min(
    config.maxLifetimeSec,
    config.minLifetimeSec + random() * config.lifetimeVariationSec,
  );

  return {
    id,
    seed,
    kind,
    clusterId: cluster.id,
    homeOffsetX,
    homeOffsetY,
    homeOffsetZ,
    wanderRadius: Math.max(
      cellSize * kindConfig.minimumWanderCellMultiplier,
      cluster.radius * kindConfig.wanderRadiusMultiplier,
    ),
    phase: random() * Math.PI * 2,
    lifetimeSec,
    baseIntensity,
    light: {
      x: homeX,
      y: homeY,
      z: homeZ,
      color: kind === 'scout' && config.differentiateScoutColor ? config.scoutColor : cluster.color,
      intensity: 0,
      distance: cellSize * kindConfig.lightDistanceMultiplier,
    },
    ageSec: 0,
    x: homeX,
    y: homeY,
    z: homeZ,
    homeX,
    homeY,
    homeZ,
    vx: (random() - 0.5) * config.motion.initialVelocityXYRange,
    vy: (random() - 0.5) * config.motion.initialVelocityXYRange,
    vz: (random() - 0.5) * config.motion.initialVelocityZRange,
    retireInSec: null,
  };
}

/** Smooth, bounded 3D wandering with separate configurable profiles per behaviour type. */
export function advanceFirefly(
  fly: Firefly,
  deltaSec: number,
  config: FireflyConfig,
): void {
  const motion = config.motion;
  const kindConfig = config.kinds[fly.kind];
  const delta = clamp(Number.isFinite(deltaSec) ? deltaSec : 0, 0, motion.maxDeltaSec);
  if (delta <= 0) return;

  fly.ageSec += delta;
  const time = fly.ageSec;
  const speed = kindConfig.speed;
  const wave = time * speed + fly.phase;
  const secondary =
    time * (speed * motion.secondarySpeedMultiplier) + fly.phase * motion.phaseMultiplier;
  const targetX =
    fly.homeX +
    Math.sin(wave) * fly.wanderRadius +
    Math.sin(secondary) * fly.wanderRadius * motion.targetXSecondaryAmplitude;
  const targetY =
    fly.homeY +
    Math.cos(wave * motion.targetYFrequencyMultiplier) *
      fly.wanderRadius * motion.targetYAmplitudeMultiplier +
    Math.sin(secondary * motion.targetYSecondaryFrequencyMultiplier) *
      fly.wanderRadius * motion.targetYSecondaryAmplitudeMultiplier;
  const targetZ =
    fly.homeZ +
    Math.sin(wave * motion.targetZFrequencyMultiplier) *
      Math.min(
        motion.targetZMaxAmplitude,
        fly.wanderRadius * motion.targetZAmplitudeWanderMultiplier,
      ) +
    Math.sin(secondary * motion.targetZSecondaryFrequencyMultiplier) *
      motion.targetZSecondaryAmplitude;

  fly.vx += (
    (targetX - fly.x) * kindConfig.pull +
    Math.sin(wave * motion.turbulenceXFrequencyMultiplier) * kindConfig.turbulence
  ) * delta;
  fly.vy += (
    (targetY - fly.y) * kindConfig.pull +
    Math.cos(secondary * motion.turbulenceYFrequencyMultiplier) * kindConfig.turbulence
  ) * delta;
  fly.vz += (
    (targetZ - fly.z) * kindConfig.pull * motion.verticalPullMultiplier +
    Math.sin(secondary * motion.turbulenceZFrequencyMultiplier) *
      kindConfig.turbulence * motion.turbulenceZMultiplier
  ) * delta;

  const damping = Math.exp(-motion.damping * delta);
  fly.vx *= damping;
  fly.vy *= damping;
  fly.vz *= damping;
  fly.x += fly.vx * delta;
  fly.y += fly.vy * delta;
  fly.z += fly.vz * delta;

  const progress = clamp(fly.ageSec / safeDivisor(fly.lifetimeSec), 0, 1);
  const fadeIn = clamp(progress / safeDivisor(motion.fadeInProgress), 0, 1);
  const fadeOut = clamp((1 - progress) / safeDivisor(motion.lightFadeOutProgress), 0, 1);
  const retireFade = fly.retireInSec === null
    ? 1
    : clamp(fly.retireInSec / safeDivisor(config.retireDurationSec), 0, 1);
  fly.light.x = fly.x;
  fly.light.y = fly.y;
  fly.light.z = fly.z;
  fly.light.intensity = fly.baseIntensity * fadeIn * fadeOut * retireFade;
}

export function fireflyVisualOpacity(fly: Firefly, config: FireflyConfig): number {
  const progress = clamp(fly.ageSec / safeDivisor(fly.lifetimeSec), 0, 1);
  const fadeIn = clamp(progress / safeDivisor(config.motion.visualFadeInProgress), 0, 1);
  const fadeOut = clamp((1 - progress) / safeDivisor(config.motion.visualFadeOutProgress), 0, 1);
  const retireFade = fly.retireInSec === null
    ? 1
    : clamp(fly.retireInSec / safeDivisor(config.retireDurationSec), 0, 1);
  return fadeIn * fadeOut * retireFade;
}

export function fireflyCameraDistanceSquared(
  fly: Pick<Firefly, 'x' | 'y' | 'z'>,
  camera: { readonly x: number; readonly y: number; readonly z: number },
): number {
  return (
    (camera.x - fly.x) ** 2 +
    (camera.y - fly.y) ** 2 +
    (camera.z - fly.z) ** 2
  );
}
