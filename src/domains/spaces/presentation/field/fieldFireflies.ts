export const FIREFLY_MAX_COUNT = 32;
export const FIREFLY_MAX_LIFETIME_SEC = 10;
export const FIREFLY_CLUSTER_REFRESH_SEC = 0.3;
export const FIREFLY_SPAWN_DISTANCE = 900;
export const FIREFLY_CLUSTER_MAX_EMITTERS = 256;

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

function parseHexColor(value: string): readonly [number, number, number] {
  const normalized = value.trim().replace(/^#/, '');
  const hex =
    normalized.length === 3
      ? normalized.split('').map((part) => part + part).join('')
      : normalized.padEnd(6, '0').slice(0, 6);
  const numeric = Number.parseInt(hex, 16);
  if (!Number.isFinite(numeric)) return [1, 0.68, 0.12];
  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];
}

function averageColor(emitters: readonly FireflyEmitter[]): string {
  let red = 0;
  let green = 0;
  let blue = 0;
  let totalWeight = 0;

  for (const emitter of emitters) {
    const color = parseHexColor(emitter.color);
    const weight = clamp(emitter.intensity, 0.1, 8);
    red += color[0] * weight;
    green += color[1] * weight;
    blue += color[2] * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return '#FFAE00';
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
): FireflyCluster[] {
  const valid = emitters
    .filter((emitter) =>
      Number.isFinite(emitter.x) &&
      Number.isFinite(emitter.y) &&
      Number.isFinite(emitter.z) &&
      Number.isFinite(emitter.intensity) &&
      emitter.intensity > 0,
    )
    .slice(0, FIREFLY_CLUSTER_MAX_EMITTERS);
  if (valid.length === 0) return [];

  const neighbourDistance = Math.max(1, cellSize * 1.55);
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
      const weight = clamp(emitter.intensity, 0.1, 8);
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
      radius: clamp(spread + cellSize * 0.42, cellSize * 0.55, cellSize * 3.5),
      color: averageColor(group),
      intensity: clamp(intensity / group.length, 0.1, 4),
      distance: clamp(distance, cellSize, cellSize * 4),
      emitterCount: group.length,
    });
  }

  return clusters;
}

export function fireflyTargetCount(cluster: FireflyCluster): number {
  return clamp(2 + Math.round(cluster.emitterCount * 1.6), 2, 12);
}

export function createFirefly(
  id: number,
  cluster: FireflyCluster,
  cellSize: number,
): Firefly {
  const seed = (Math.imul(id + 1, 0x9e3779b1) ^ hashText(cluster.id)) >>> 0;
  const random = makeRandom(seed);
  const kindRoll = random();
  // About 3% are rare scouts. They roam farther and carry a slightly stronger light.
  const kind: FireflyKind =
    kindRoll < 0.03 ? 'scout' : kindRoll < 0.26 ? 'wanderer' : 'drifter';
  const angle = random() * Math.PI * 2;
  const radialDistance = Math.sqrt(random()) * cluster.radius;
  const homeOffsetX = Math.cos(angle) * radialDistance;
  const homeOffsetY = Math.sin(angle) * radialDistance;
  const homeOffsetZ = 5 + random() * Math.min(22, cellSize * 0.45);
  const homeX = cluster.x + homeOffsetX;
  const homeY = cluster.y + homeOffsetY;
  const homeZ = cluster.z + homeOffsetZ;
  const wanderMultiplier = kind === 'scout' ? 2.8 : kind === 'wanderer' ? 1.75 : 1.05;
  const minimumWanderDistance =
    cellSize * (kind === 'scout' ? 8 : kind === 'wanderer' ? 2 : 0.45);
  const baseIntensity = (kind === 'scout' ? 0.95 : kind === 'wanderer' ? 0.68 : 0.5) *
    clamp(cluster.intensity / 1.8, 0.55, 1.15);
  const lifetimeSec = Math.min(
    FIREFLY_MAX_LIFETIME_SEC,
    3.2 + random() * 6.5,
  );

  return {
    id,
    seed,
    kind,
    clusterId: cluster.id,
    homeOffsetX,
    homeOffsetY,
    homeOffsetZ,
    wanderRadius: Math.max(minimumWanderDistance, cluster.radius * wanderMultiplier),
    phase: random() * Math.PI * 2,
    lifetimeSec,
    baseIntensity,
    light: {
      x: homeX,
      y: homeY,
      z: homeZ,
      color: kind === 'scout' ? '#FFF0B0' : cluster.color,
      intensity: 0,
      distance: cellSize * (kind === 'scout' ? 2.2 : 1.7),
    },
    ageSec: 0,
    x: homeX,
    y: homeY,
    z: homeZ,
    homeX,
    homeY,
    homeZ,
    vx: (random() - 0.5) * 5,
    vy: (random() - 0.5) * 5,
    vz: (random() - 0.5) * 1.5,
    retireInSec: null,
  };
}

/** Smooth, bounded 3D wandering with different ranges for the three behaviour types. */
export function advanceFirefly(fly: Firefly, deltaSec: number): void {
  const delta = clamp(Number.isFinite(deltaSec) ? deltaSec : 0, 0, 0.05);
  if (delta <= 0) return;

  fly.ageSec += delta;
  const time = fly.ageSec;
  const speed = fly.kind === 'scout' ? 1.35 : fly.kind === 'wanderer' ? 0.95 : 0.65;
  const wave = time * speed + fly.phase;
  const secondary = time * (speed * 0.43) + fly.phase * 1.73;
  const targetX =
    fly.homeX +
    Math.sin(wave) * fly.wanderRadius +
    Math.sin(secondary) * fly.wanderRadius * 0.32;
  const targetY =
    fly.homeY +
    Math.cos(wave * 0.79) * fly.wanderRadius * 0.78 +
    Math.sin(secondary * 0.83) * fly.wanderRadius * 0.3;
  const targetZ =
    fly.homeZ +
    Math.sin(wave * 1.9) * Math.min(12, fly.wanderRadius * 0.28) +
    Math.sin(secondary * 1.37) * 3.5;

  const pull = fly.kind === 'scout' ? 1.7 : fly.kind === 'wanderer' ? 2.4 : 3.1;
  const turbulence = fly.kind === 'scout' ? 24 : fly.kind === 'wanderer' ? 14 : 8;
  fly.vx += ((targetX - fly.x) * pull + Math.sin(wave * 2.7) * turbulence) * delta;
  fly.vy += ((targetY - fly.y) * pull + Math.cos(secondary * 2.4) * turbulence) * delta;
  fly.vz += ((targetZ - fly.z) * pull * 0.55 + Math.sin(secondary * 3.1) * turbulence * 0.14) * delta;

  const damping = Math.exp(-2.05 * delta);
  fly.vx *= damping;
  fly.vy *= damping;
  fly.vz *= damping;
  fly.x += fly.vx * delta;
  fly.y += fly.vy * delta;
  fly.z += fly.vz * delta;

  const progress = clamp(fly.ageSec / fly.lifetimeSec, 0, 1);
  const fadeIn = clamp(progress / 0.12, 0, 1);
  const fadeOut = clamp((1 - progress) / 0.2, 0, 1);
  const retireFade = fly.retireInSec === null ? 1 : clamp(fly.retireInSec / 0.8, 0, 1);
  fly.light.x = fly.x;
  fly.light.y = fly.y;
  fly.light.z = fly.z;
  fly.light.intensity = fly.baseIntensity * fadeIn * fadeOut * retireFade;
}

export function fireflyVisualOpacity(fly: Firefly): number {
  const progress = clamp(fly.ageSec / fly.lifetimeSec, 0, 1);
  const fadeIn = clamp(progress / 0.09, 0, 1);
  const fadeOut = clamp((1 - progress) / 0.18, 0, 1);
  const retireFade = fly.retireInSec === null ? 1 : clamp(fly.retireInSec / 0.8, 0, 1);
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
