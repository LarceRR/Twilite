/** Nested Field Space tuning knobs (runtime-overridable). */

/**
 * A three-component vector.
 * For camera position/directional-light position, components are world units;
 * for camera rotation, components are degrees.
 */
export type FieldVec3 = {
  /** X component: horizontal/world X coordinate, or X-axis rotation in degrees. */
  readonly x: number;
  /** Y component: depth/world Y coordinate, or Y-axis rotation in degrees. */
  readonly y: number;
  /** Z component: vertical/world Z coordinate, or Z-axis rotation in degrees. */
  readonly z: number;
};

export type FieldConfig = {
  /** Configuration for field dimensions and logical grid cell layout. */
  readonly grid: {
    /** Clear interior width/height of a cell in logical pixels, excluding its divider. */
    readonly cellSizePx: number;
    /** Width of the line separating cells, in logical pixels. */
    readonly dividerWidthPx: number;
    /** Show or hide the divider lines without changing grid spacing. */
    readonly showDividers: boolean;
    /** Number of columns in the central field band. */
    readonly centerCols: number;
    /** Number of additional columns added to each side of the central band. */
    readonly sideExtraCols: number;
    /** Number of rows in the field grid along the depth axis. */
    readonly rows: number;
  };
  /** Shape, edge finish and emissive appearance of the platform tiles. */
  readonly platform: {
    /** Vertical thickness of each platform tile, in world units. */
    readonly height: number;
    /** Radius applied to the four plan-view corners, in world units. */
    readonly cornerRadius: number;
    /** Size of the real 3D bevel on the upper and lower tile edges. */
    readonly edgeBevel: number;
    /** Emissive strength of a platform tile before flicker modulation. */
    readonly emissiveIntensity: number;
  };
  /** Controls streamed chunks and how much field geometry is kept around the camera. */
  readonly chunks: {
    /** Number of columns contained in one streamed/rendered chunk. */
    readonly cols: number;
    /** Number of chunks retained behind the camera's current focus. */
    readonly behind: number;
    /** Number of chunks kept ahead of the camera's current focus. */
    readonly ahead: number;
    /** Extra world-space distance used to choose the chunk-streaming focus ahead of the camera. */
    readonly lookAheadPx: number;
    /** Additional chunks prepared beyond the visible forward window. */
    readonly prefetchExtraAhead: number;
    /** Number of queued GPU texture uploads allowed during steady-state processing per frame. */
    readonly gpuUploadSteady: number;
    /** Z-axis offset applied to grid divider lines so they render above the surface. */
    readonly lineZLift: number;
  };
  /** Continuous world-space grass sprites, their visual noise, and mobile generation budget. */
  readonly grass: {
    readonly enabled: boolean;
    /** Centre-to-centre distance between grass blades in world units. */
    readonly spacing: number;
    readonly bladeWidth: number;
    readonly bladeHeight: number;
    /** Fixed instance capacity avoids reallocating GPU buffers while the spacing slider moves. */
    readonly maxInstancesPerChunk: number;
    /** Number of grass instances generated during one animation frame. */
    readonly generationBatchSize: number;
    readonly edgeMargin: number;
    readonly jitterRatio: number;
    readonly occupiedClearanceRatio: number;
    readonly accentProbability1: number;
    readonly accentProbability2: number;
    readonly accentOffset1: number;
    readonly accentOffset2: number;
    readonly receiveShadows: boolean;
    readonly windEnabled: boolean;
    readonly windDirectionX: number;
    readonly windDirectionY: number;
    readonly windScale: number;
    readonly windSpeed: number;
    readonly windThreshold: number;
    readonly windDivergence: number;
    readonly windAngle: number;
    readonly windFramerate: number;
    readonly viewSwaySpeed: number;
    readonly viewSwayAngle: number;
    readonly albedoNoiseEnabled: boolean;
    readonly albedoScale2: number;
    readonly albedoThreshold2: number;
    readonly albedoScale3: number;
    readonly albedoThreshold3: number;
    readonly cloudShadowsEnabled: boolean;
    readonly cloudNoiseScale: number;
    readonly cloudSpeed: number;
    readonly cloudContrast: number;
    readonly cloudThreshold: number;
    readonly cloudShadowStrength: number;
  };
  /** Controls the expanding pixel-style wave shown after tapping or holding a grid cell. */
  readonly wave: {
    /** Maximum diameter of a wave in logical world pixels. */
    readonly sizePx: number;
    /** Size of each logical pixel step used to rasterize the wave. */
    readonly pixelSizePx: number;
    /** Peak wave opacity, from 0 (invisible) to 1 (opaque). */
    readonly maxAlpha: number;
    /** Total lifetime of a wave in seconds. */
    readonly durationSec: number;
    /** Fraction of the wave lifetime used for the fade-in phase, from 0 to 1. */
    readonly fadeInEnd: number;
    /** Fraction of the wave lifetime where fade-out starts, from 0 to 1. */
    readonly fadeOutStart: number;
  };
  /** Controls the initial camera pose, framing, input response and inertia. */
  readonly camera: {
    /** Initial camera position in world coordinates. */
    readonly position: FieldVec3;
    /** Initial camera Euler rotation in degrees for X, Y and Z. */
    readonly rotationDeg: FieldVec3;
    /** Perspective camera vertical field of view, in degrees. */
    readonly fov: number;
    /** Nearest renderable camera depth, in world units. */
    readonly near: number;
    /** Farthest renderable camera depth, in world units. */
    readonly far: number;
    /** Extra multiplier around the computed camera framing bounds; values above 1 add breathing room. */
    readonly framingMargin: number;
    /** Elevation angle used when calculating a camera framing pose, in degrees. */
    readonly framingElevationDeg: number;
    /** Base camera movement increment per directional input, in logical pixels/world units. */
    readonly moveStepPx: number;
    /** Camera rotation increment for one rotation input, in degrees. */
    readonly rotateStepDeg: number;
    /** Hold duration before continuous camera movement reaches its accelerated phase, in milliseconds. */
    readonly holdRampMs: number;
    /** Maximum multiplier applied to movement while a direction remains pressed. */
    readonly holdMaxStep: number;
    /** Multiplier converting finger-release velocity into camera world velocity. */
    readonly swipeInertiaSpeedScale: number;
    /** Upper limit for camera velocity after a swipe release, in world units per second. */
    readonly swipeInertiaMaxSpeed: number;
    /** Unitless drag coefficient used by the analytic friction simulation; higher values slow inertia faster. */
    readonly swipeInertiaDrag: number;
    /** Inertia integration stops when camera speed falls below this value, in world units per second. */
    readonly swipeInertiaStopSpeed: number;
    /** Maximum frame delta accepted by the swipe-inertia simulation, in seconds. */
    readonly swipeFrameDeltaMaxSec: number;
    /** Minimum interval between publishing camera/HUD state updates, in milliseconds. */
    readonly hudPublishMs: number;
    /** Duration of the temporary highlight shown on the active world axis, in milliseconds. */
    readonly activeAxisHighlightMs: number;
  };
  /** Controls visual scale and placement of labels rendered inside grid cells. */
  readonly labels: {
    /** Overall label scale multiplier; 1 preserves the label's computed base size. */
    readonly scale: number;
    /** Padding between label pixels and the label texture's border, in pixels. */
    readonly padding: number;
    /** Height offset that lifts labels above the field surface, in world units. */
    readonly raise: number;
    /** Size of the highlighted center marker for the active cell, in logical pixels. */
    readonly activeCenterSize: number;
    /** Thickness of the active-cell label/marker border, in logical pixels. */
    readonly activeBorder: number;
  };
  /** Controls visual highlighting for active cells and their labels. */
  readonly activeCells: {
    /** Number of cell columns/rows around the focus that receive side-cell highlighting. */
    readonly sideSpan: number;
    /** Hex color used to fill highlighted neighbouring cells. */
    readonly fillHex: string;
    /** Hex color used for the active cell's center marker. */
    readonly centerHex: string;
    /** Hex color used to draw text/labels on active cells. */
    readonly labelTextHex: string;
  };
  /** Controls the optional 3D world-axis debug helper. */
  readonly axes: {
    /** Total length of each debug world axis, in world units. */
    readonly length: number;
    /** Length of each arrow head, in world units. */
    readonly headLength: number;
    /** Width of each arrow head, in world units. */
    readonly headWidth: number;
    /** Radius of the sphere marking the world origin, in world units. */
    readonly originRadius: number;
    /** Z-axis offset that lifts the debug axes above the field surface. */
    readonly liftZ: number;
    /** Render order used by axis helper objects; larger values draw later. */
    readonly renderOrder: number;
  };
  /** Controls single-press and long-press gesture recognition on a field cell. */
  readonly press: {
    /** Duration a pointer must remain pressed before the gesture is treated as a long press, in milliseconds. */
    readonly longPressMs: number;
    /** Delay between the first and second wave in a long-press burst, in seconds. */
    readonly secondBurstGapSec: number;
  };
  /** Controls repeated camera movement while a directional control remains held. */
  readonly holdRepeat: {
    /** Interval between repeated movement ticks while a control is held, in milliseconds. */
    readonly tickMs: number;
    /** Delay after the initial input before repeated movement begins, in milliseconds. */
    readonly startDelayMs: number;
  };
  /** Procedural particles emitted by objects with active light sources. */
  readonly fireflies: {
    readonly enabled: boolean;
    /** Live particle limit; the renderer has a fixed capacity of 32 instances. */
    readonly maxCount: number;
    /** Width and height of one pixel-art particle, in world units. */
    readonly pixelSize: number;
    readonly maxLifetimeSec: number;
    readonly minLifetimeSec: number;
    readonly lifetimeVariationSec: number;
    readonly clusterRefreshSec: number;
    readonly spawnDistance: number;
    readonly clusterMaxEmitters: number;
    readonly clusterNeighbourDistanceMultiplier: number;
    readonly minimumClusterNeighbourDistance: number;
    readonly clusterDistanceMinCellMultiplier: number;
    readonly clusterDistanceMaxCellMultiplier: number;
    readonly clusterRadiusOffsetCellMultiplier: number;
    readonly clusterRadiusMinCellMultiplier: number;
    readonly clusterRadiusMaxCellMultiplier: number;
    readonly emitterWeightMin: number;
    readonly emitterWeightMax: number;
    readonly clusterIntensityMin: number;
    readonly clusterIntensityMax: number;
    readonly targetBaseCount: number;
    readonly targetPerEmitter: number;
    readonly targetMinCount: number;
    readonly targetMaxCount: number;
    readonly scoutChance: number;
    readonly wandererChance: number;
    readonly spawnHeightMin: number;
    readonly spawnHeightRange: number;
    readonly spawnHeightCellMultiplier: number;
    readonly spawnIntervalSec: number;
    readonly initialSpawnBudget: number;
    readonly spawnBudgetPerInterval: number;
    readonly retireDurationSec: number;
    readonly minVisibleLightIntensity: number;
    readonly visibleClusterRadiusMultiplier: number;
    readonly visibleClusterCellMultiplier: number;
    /** Maximum local tile-light shader slots reserved for moving fireflies; hard limit 4. */
    readonly maxLocalLights: number;
    readonly opacityDiscardThreshold: number;
    readonly fallbackColor: string;
    readonly differentiateScoutColor: boolean;
    readonly scoutColor: string;
    readonly intensityScaleDivisor: number;
    readonly intensityMultiplierMin: number;
    readonly intensityMultiplierMax: number;
    readonly motion: {
      readonly maxDeltaSec: number;
      readonly fadeInProgress: number;
      readonly lightFadeOutProgress: number;
      readonly visualFadeInProgress: number;
      readonly visualFadeOutProgress: number;
      readonly secondarySpeedMultiplier: number;
      readonly phaseMultiplier: number;
      readonly targetXSecondaryAmplitude: number;
      readonly targetYFrequencyMultiplier: number;
      readonly targetYAmplitudeMultiplier: number;
      readonly targetYSecondaryFrequencyMultiplier: number;
      readonly targetYSecondaryAmplitudeMultiplier: number;
      readonly targetZFrequencyMultiplier: number;
      readonly targetZMaxAmplitude: number;
      readonly targetZAmplitudeWanderMultiplier: number;
      readonly targetZSecondaryAmplitude: number;
      readonly targetZSecondaryFrequencyMultiplier: number;
      readonly verticalPullMultiplier: number;
      readonly turbulenceXFrequencyMultiplier: number;
      readonly turbulenceYFrequencyMultiplier: number;
      readonly turbulenceZFrequencyMultiplier: number;
      readonly turbulenceZMultiplier: number;
      readonly damping: number;
      readonly initialVelocityXYRange: number;
      readonly initialVelocityZRange: number;
    };
    readonly kinds: {
      readonly drifter: {
        readonly wanderRadiusMultiplier: number;
        readonly minimumWanderCellMultiplier: number;
        readonly baseIntensity: number;
        readonly lightDistanceMultiplier: number;
        readonly speed: number;
        readonly pull: number;
        readonly turbulence: number;
      };
      readonly wanderer: {
        readonly wanderRadiusMultiplier: number;
        readonly minimumWanderCellMultiplier: number;
        readonly baseIntensity: number;
        readonly lightDistanceMultiplier: number;
        readonly speed: number;
        readonly pull: number;
        readonly turbulence: number;
      };
      readonly scout: {
        readonly wanderRadiusMultiplier: number;
        readonly minimumWanderCellMultiplier: number;
        readonly baseIntensity: number;
        readonly lightDistanceMultiplier: number;
        readonly speed: number;
        readonly pull: number;
        readonly turbulence: number;
      };
    };
  };
  /** Scene lighting, temporary object glow and shared shadow-map settings. */
  readonly lighting: {
    /** Base fill illumination applied uniformly to the scene. */
    readonly ambientIntensity: number;
    /** Intensity of the shared directional light used to illuminate geometry and cast shadows. */
    readonly directionalIntensity: number;
    /** Directional-light position offset from the camera focus, in world units [X, Y, Z]. */
    readonly directionalPosition: readonly [number, number, number];
    /** Warm low-level reflectance tint blended into the field and raised platform materials. */
    readonly surfaceAmbientColor: string;
    /** Strength of the warm base reflectance tint, separate from actual scene lights. */
    readonly surfaceAmbientIntensity: number;
    /** Color emission and pixel-light contribution of platform tiles. */
    readonly objectGlow: {
      /** Makes every platform contribute pixel light using the fallback settings, even without backend emission metadata. */
      readonly forceAllObjectsForTesting: boolean;
      /** Default RGB hex color for a tile when backend emission color is unavailable. */
      readonly fallbackColor: string;
      /** Base energy added to the pixel-light shader before flicker modulation. */
      readonly fallbackIntensity: number;
      /** Maximum distance in world units where fallback tile emission affects the surface shader. */
      readonly fallbackDistance: number;
      /** Pixel-light contributions at or below this flickered energy are skipped. */
      readonly minimumVisibleIntensity: number;
      /** Controls the irregular brightness modulation shared by the local light and pixel-glow overlay. */
      readonly flicker: {
        /** Minimum value of the flicker multiplier before its randomised amplitude is added. */
        readonly minMultiplier: number;
        /** Amplitude of the slow flicker component; larger values create broader brightness changes. */
        readonly slowAmplitude: number;
        /** Amplitude of the medium-speed flicker component. */
        readonly mediumAmplitude: number;
        /** Amplitude of the fast flicker component. */
        readonly fastAmplitude: number;
        /** Update interval of the slow flicker component, in milliseconds. */
        readonly slowIntervalMs: number;
        /** Update interval of the medium flicker component, in milliseconds. */
        readonly mediumIntervalMs: number;
        /** Update interval of the fast flicker component, in milliseconds. */
        readonly fastIntervalMs: number;
        /** Scale used to round the resulting flicker multiplier; 100 rounds to two decimal places. */
        readonly roundingScale: number;
      };
      /** Controls how tile emission is represented as low-resolution light pixels on surfaces. */
      readonly pixelOverlay: {
        /** Width/height of each pixel-glow cell in logical world pixels. */
        readonly pixelSizePx: number;
        /** Multiplier applied to light intensity before accumulating pixel-glow color. */
        readonly intensityScale: number;
        /** Multiplier converting accumulated light energy to overlay opacity. */
        readonly alphaScale: number;
        /** Upper limit for pixel-glow overlay opacity, from 0 (invisible) to 1 (opaque). */
        readonly maxAlpha: number;
        /** Blend factor for mixing the pixel light color into already-painted surface pixels, from 0 to 1. */
        readonly surfaceColorMix: number;
      };
    };
    /** Parameters for the single shared low-resolution directional shadow map. */
    readonly shadows: {
      /** Width and height of the square directional shadow map, in texels. */
      readonly mapSizePx: number;
      /** Filter radius multiplier used to soften directional shadow edges. */
      readonly filterRadius: number;
      /** Left clipping boundary of the directional shadow camera, in world units. */
      readonly cameraLeft: number;
      /** Right clipping boundary of the directional shadow camera, in world units. */
      readonly cameraRight: number;
      /** Top clipping boundary of the directional shadow camera, in world units. */
      readonly cameraTop: number;
      /** Bottom clipping boundary of the directional shadow camera, in world units. */
      readonly cameraBottom: number;
      /** Nearest depth rendered into the shadow map, in world units. */
      readonly cameraNear: number;
      /** Farthest depth rendered into the shadow map, in world units. */
      readonly cameraFar: number;
      /** Constant depth bias used to reduce shadow acne; extreme values can cause detached shadows. */
      readonly bias: number;
      /** Additional normal-based depth bias used to reduce shadow acne on sloped surfaces. */
      readonly normalBias: number;
      /** Opacity multiplier of the shared directional shadow map. */
      readonly baselineIntensity: number;
    };
  };
};

export type FieldConfigOverrides = DeepPartial<FieldConfig>;

export type DeepPartial<T> = {
  readonly [K in keyof T]?: T[K] extends readonly (infer U)[]
    ? readonly U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export const DEFAULT_FIELD_CONFIG: FieldConfig = {
  grid: {
    cellSizePx: 60,
    dividerWidthPx: 1,
    showDividers: true,
    centerCols: 10,
    sideExtraCols: 20,
    rows: 15,
  },
  platform: {
    height: 6,
    cornerRadius: 3,
    edgeBevel: 1,
    emissiveIntensity: 0.3,
  },
  chunks: {
    cols: 10,
    behind: 1,
    ahead: 3,
    lookAheadPx: 500,
    prefetchExtraAhead: 2,
    gpuUploadSteady: 1,
    lineZLift: 0.5,
  },
  grass: {
    enabled: true,
    spacing: 18,
    bladeWidth: 20,
    bladeHeight: 30,
    maxInstancesPerChunk: 3600,
    generationBatchSize: 360,
    edgeMargin: 12,
    jitterRatio: 0.98,
    occupiedClearanceRatio: 0.28,
    accentProbability1: 0.001,
    accentProbability2: 0.0001,
    accentOffset1: 10,
    accentOffset2: 18.5,
    receiveShadows: false,
    windEnabled: true,
    windDirectionX: 0,
    windDirectionY: 1,
    windScale: 0.00071,
    windSpeed: 0.025,
    windThreshold: 0.365,
    windDivergence: 10,
    windAngle: 60,
    windFramerate: 5,
    viewSwaySpeed: 0.1,
    viewSwayAngle: 10,
    albedoNoiseEnabled: true,
    albedoScale2: 0.0011,
    albedoThreshold2: 0.537,
    albedoScale3: 0.001,
    albedoThreshold3: 0.471,
    cloudShadowsEnabled: true,
    cloudNoiseScale: 4000,
    cloudSpeed: -0.01,
    cloudContrast: 3.845,
    cloudThreshold: 0.27,
    cloudShadowStrength: 0.82,
  },
  wave: {
    sizePx: 96,
    pixelSizePx: 4,
    maxAlpha: 0.8,
    durationSec: 0.48,
    fadeInEnd: 0.08,
    fadeOutStart: 0.55,
  },
  fireflies: {
    enabled: true,
    maxCount: 16,
    pixelSize: 1,
    maxLifetimeSec: 10,
    minLifetimeSec: 3.2,
    lifetimeVariationSec: 6.5,
    clusterRefreshSec: 0.3,
    spawnDistance: 900,
    clusterMaxEmitters: 64,
    clusterNeighbourDistanceMultiplier: 1.55,
    minimumClusterNeighbourDistance: 1,
    clusterDistanceMinCellMultiplier: 1,
    clusterDistanceMaxCellMultiplier: 4,
    clusterRadiusOffsetCellMultiplier: 0.42,
    clusterRadiusMinCellMultiplier: 0.55,
    clusterRadiusMaxCellMultiplier: 3.5,
    emitterWeightMin: 0.1,
    emitterWeightMax: 8,
    clusterIntensityMin: 0.1,
    clusterIntensityMax: 4,
    targetBaseCount: 2,
    targetPerEmitter: 1.6,
    targetMinCount: 2,
    targetMaxCount: 12,
    scoutChance: 0.03,
    wandererChance: 0.23,
    spawnHeightMin: 5,
    spawnHeightRange: 22,
    spawnHeightCellMultiplier: 0.45,
    spawnIntervalSec: 0.12,
    initialSpawnBudget: 3,
    spawnBudgetPerInterval: 2,
    retireDurationSec: 0.8,
    minVisibleLightIntensity: 0.005,
    visibleClusterRadiusMultiplier: 1.8,
    visibleClusterCellMultiplier: 3,
    maxLocalLights: 4,
    opacityDiscardThreshold: 0.001,
    fallbackColor: '#FFAE00',
    differentiateScoutColor: true,
    scoutColor: '#FFF0B0',
    intensityScaleDivisor: 1.8,
    intensityMultiplierMin: 0.55,
    intensityMultiplierMax: 1.15,
    motion: {
      maxDeltaSec: 0.05,
      fadeInProgress: 0.12,
      lightFadeOutProgress: 0.2,
      visualFadeInProgress: 0.09,
      visualFadeOutProgress: 0.18,
      secondarySpeedMultiplier: 0.43,
      phaseMultiplier: 1.73,
      targetXSecondaryAmplitude: 0.32,
      targetYFrequencyMultiplier: 0.79,
      targetYAmplitudeMultiplier: 0.78,
      targetYSecondaryFrequencyMultiplier: 0.83,
      targetYSecondaryAmplitudeMultiplier: 0.3,
      targetZFrequencyMultiplier: 1.9,
      targetZMaxAmplitude: 12,
      targetZAmplitudeWanderMultiplier: 0.28,
      targetZSecondaryAmplitude: 3.5,
      targetZSecondaryFrequencyMultiplier: 1.37,
      verticalPullMultiplier: 0.55,
      turbulenceXFrequencyMultiplier: 2.7,
      turbulenceYFrequencyMultiplier: 2.4,
      turbulenceZFrequencyMultiplier: 3.1,
      turbulenceZMultiplier: 0.14,
      damping: 2.05,
      initialVelocityXYRange: 5,
      initialVelocityZRange: 1.5,
    },
    kinds: {
      drifter: {
        wanderRadiusMultiplier: 1.05,
        minimumWanderCellMultiplier: 0.45,
        baseIntensity: 0.5,
        lightDistanceMultiplier: 1.7,
        speed: 0.65,
        pull: 3.1,
        turbulence: 8,
      },
      wanderer: {
        wanderRadiusMultiplier: 1.75,
        minimumWanderCellMultiplier: 2,
        baseIntensity: 0.68,
        lightDistanceMultiplier: 1.7,
        speed: 0.95,
        pull: 2.4,
        turbulence: 14,
      },
      scout: {
        wanderRadiusMultiplier: 2.8,
        minimumWanderCellMultiplier: 8,
        baseIntensity: 0.95,
        lightDistanceMultiplier: 2.2,
        speed: 1.35,
        pull: 1.7,
        turbulence: 24,
      },
    },
  },
  camera: {
    position: { x: -323, y: 0, z: 171 },
    rotationDeg: { x: 83, y: 0, z: -90 },
    fov: 42,
    near: 1,
    far: 30_000,
    framingMargin: 1.18,
    framingElevationDeg: 58,
    moveStepPx: 1,
    rotateStepDeg: 1,
    holdRampMs: 1500,
    holdMaxStep: 20,
    // A modest boost lets fast flicks carry naturally past the first visible chunk.
    swipeInertiaSpeedScale: 1.25,
    // Let strong flicks travel across several chunks while keeping a safety limit.
    swipeInertiaMaxSpeed: 3600,
    swipeInertiaDrag: 0.135,
    swipeInertiaStopSpeed: 0.5,
    swipeFrameDeltaMaxSec: 0.05,
    hudPublishMs: 100,
    activeAxisHighlightMs: 280,
  },
  labels: {
    scale: 1,
    padding: 3,
    raise: 10,
    activeCenterSize: 6,
    activeBorder: 1,
  },
  activeCells: {
    sideSpan: 2,
    fillHex: '#fdba2f',
    centerHex: '#ff1493',
    labelTextHex: '#18151E',
  },
  axes: {
    length: 180,
    headLength: 36,
    headWidth: 18,
    originRadius: 8,
    liftZ: 6,
    renderOrder: 1000,
  },
  press: {
    longPressMs: 330,
    secondBurstGapSec: 0.12,
  },
  holdRepeat: {
    tickMs: 50,
    startDelayMs: 180,
  },
  lighting: {
    // Physically based units: lit faces receive (ambient + N.L * directional) / PI.
    // The sun is high and slightly behind/left of the camera, so tile tops are
    // bright, the walls facing the camera sit in readable half-shade and
    // shadows fall forward and to the side of raised tiles.
    ambientIntensity: 1.4,
    directionalIntensity: 2.2,
    directionalPosition: [-160, 260, 420],
    surfaceAmbientColor: '#FFAE00',
    surfaceAmbientIntensity: 0.025,
    objectGlow: {
      forceAllObjectsForTesting: false,
      fallbackColor: '#FFAE00',
      fallbackIntensity: 2.1,
      fallbackDistance: 300,
      minimumVisibleIntensity: 0.005,
      flicker: {
        minMultiplier: 0.62,
        slowAmplitude: 0.16,
        mediumAmplitude: 0.1,
        fastAmplitude: 0.06,
        slowIntervalMs: 113,
        mediumIntervalMs: 47,
        fastIntervalMs: 23,
        roundingScale: 100,
      },
      pixelOverlay: {
        pixelSizePx: 8,
        intensityScale: 0.5,
        alphaScale: 0.55,
        maxAlpha: 0.48,
        surfaceColorMix: 0.65,
      },
    },
    shadows: {
      mapSizePx: 512,
      filterRadius: 6,
      cameraLeft: -900,
      cameraRight: 900,
      cameraTop: 600,
      cameraBottom: -600,
      cameraNear: 0.1,
      cameraFar: 4000,
      bias: -0.0005,
      // About half a shadow texel in world units: removes acne on tile tops
      // without detaching shadows from the 2-unit tile steps.
      normalBias: 0.8,
      // Shadowed areas keep only ambient + local candle light, like in reality.
      baselineIntensity: 0.92,
    },
  },
};

export function fieldGridColsFromConfig(grid: FieldConfig['grid']): number {
  return grid.centerCols + grid.sideExtraCols * 2;
}

export function fieldGridWidthFromConfig(grid: FieldConfig['grid']): number {
  return fieldGridColsFromConfig(grid) * (grid.cellSizePx + grid.dividerWidthPx);
}

export function fieldGridHeightFromConfig(grid: FieldConfig['grid']): number {
  return grid.rows * (grid.cellSizePx + grid.dividerWidthPx) + grid.dividerWidthPx;
}

export function fieldWaveMaxRadiusPx(wave: FieldConfig['wave']): number {
  return wave.sizePx / 2;
}

export function fieldWaveMaxRadiusSteps(wave: FieldConfig['wave']): number {
  return Math.floor(fieldWaveMaxRadiusPx(wave) / wave.pixelSizePx);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const mergedSectionCache = new WeakMap<object, WeakMap<object, object>>();

function mergeSection<T extends Record<string, unknown>>(
  base: T,
  patch: DeepPartial<T> | undefined,
): T {
  if (patch == null) return base;

  // Overrides are immutable. Reuse merged nested sections when their patch
  // reference has not changed, so editing fireflies cannot recreate artwork,
  // textures, or geometry in an unrelated lighting section.
  const patchObject = patch as object;
  let byPatch = mergedSectionCache.get(base);
  const cached = byPatch?.get(patchObject);
  if (cached !== undefined) return cached as T;

  const next: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch) as (keyof T & string)[]) {
    const patchValue = patch[key];
    if (patchValue === undefined) continue;
    const baseValue = base[key];
    next[key] =
      isPlainObject(baseValue) && isPlainObject(patchValue)
        ? mergeSection(
            baseValue as Record<string, unknown>,
            patchValue as DeepPartial<Record<string, unknown>>,
          )
        : patchValue;
  }

  const result = next as T;
  if (byPatch === undefined) {
    byPatch = new WeakMap<object, object>();
    mergedSectionCache.set(base, byPatch);
  }
  byPatch.set(patchObject, result);
  return result;
}

export function mergeFieldConfig(overrides: FieldConfigOverrides = {}): FieldConfig {
  return {
    grid: mergeSection(DEFAULT_FIELD_CONFIG.grid, overrides.grid),
    chunks: mergeSection(DEFAULT_FIELD_CONFIG.chunks, overrides.chunks),
    grass: mergeSection(DEFAULT_FIELD_CONFIG.grass, overrides.grass),
    wave: mergeSection(DEFAULT_FIELD_CONFIG.wave, overrides.wave),
    fireflies: mergeSection(DEFAULT_FIELD_CONFIG.fireflies, overrides.fireflies),
    camera: mergeSection(
      DEFAULT_FIELD_CONFIG.camera as unknown as Record<string, unknown>,
      overrides.camera as DeepPartial<Record<string, unknown>> | undefined,
    ) as FieldConfig['camera'],
    labels: mergeSection(DEFAULT_FIELD_CONFIG.labels, overrides.labels),
    activeCells: mergeSection(DEFAULT_FIELD_CONFIG.activeCells, overrides.activeCells),
    axes: mergeSection(DEFAULT_FIELD_CONFIG.axes, overrides.axes),
    press: mergeSection(DEFAULT_FIELD_CONFIG.press, overrides.press),
    holdRepeat: mergeSection(DEFAULT_FIELD_CONFIG.holdRepeat, overrides.holdRepeat),
    platform: mergeSection(DEFAULT_FIELD_CONFIG.platform, overrides.platform),
    lighting: mergeSection(
      DEFAULT_FIELD_CONFIG.lighting as unknown as Record<string, unknown>,
      overrides.lighting as DeepPartial<Record<string, unknown>> | undefined,
    ) as FieldConfig['lighting'],
  };
}

export function hexToRgbaTuple(
  hex: string,
  alpha: number = 255,
): readonly [number, number, number, number] {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}
