import {
  DEFAULT_FIELD_CONFIG,
  mergeFieldConfig,
  type DeepPartial,
  type FieldConfig,
  type FieldConfigOverrides,
} from '@/domains/spaces/presentation/field/fieldConfig';

const FIELD_CONFIG_JSON_FORMAT = 'twilite-field-config';
const FIELD_CONFIG_JSON_VERSION = 1;

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateValue(value: unknown, schema: unknown, path: string): unknown {
  if (Array.isArray(schema)) {
    if (!Array.isArray(value) || value.length !== schema.length) {
      throw new Error(`"${path}" must be an array with ${schema.length} entries.`);
    }
    return value.map((entry, index) => validateValue(entry, schema[index], `${path}.${index}`));
  }

  if (isJsonObject(schema)) {
    if (!isJsonObject(value)) {
      throw new Error(`"${path}" must be an object.`);
    }

    const schemaKeys = new Set(Object.keys(schema));
    const unknownKey = Object.keys(value).find((key) => !schemaKeys.has(key));
    if (unknownKey !== undefined) {
      throw new Error(`Unknown setting "${path.length === 0 ? unknownKey : `${path}.${unknownKey}`}".`);
    }

    const result: JsonObject = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = validateValue(child, schema[key], path.length === 0 ? key : `${path}.${key}`);
    }
    return result;
  }

  if (typeof value !== typeof schema) {
    throw new Error(`"${path}" has the wrong value type.`);
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`"${path}" must be a finite number.`);
  }
  if (typeof schema === 'string' && typeof value === 'string' && (path.toLowerCase().includes('color') || path.toLowerCase().endsWith('hex'))) {
    if (!/^#[0-9a-f]{6}$/i.test(value)) {
      throw new Error(`"${path}" must be a HEX color in #RRGGBB format.`);
    }
  }
  return value;
}

function assertConfigConstraint(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Некорректная конфигурация: ${message}`);
}

function validateConfigConstraints(config: FieldConfig): void {
  assertConfigConstraint(
    Number.isInteger(config.grid.cellSizePx) && config.grid.cellSizePx > 0,
    'grid.cellSizePx должен быть положительным целым числом.',
  );
  assertConfigConstraint(
    Number.isInteger(config.grid.dividerWidthPx) && config.grid.dividerWidthPx >= 0,
    'grid.dividerWidthPx должен быть целым числом не меньше нуля.',
  );
  assertConfigConstraint(
    Number.isInteger(config.grid.rows) && config.grid.rows > 0 &&
      Number.isInteger(config.grid.centerCols) && config.grid.centerCols > 0 &&
      Number.isInteger(config.grid.sideExtraCols) && config.grid.sideExtraCols >= 0,
    'размеры сетки должны быть целыми числами в допустимом диапазоне.',
  );
  assertConfigConstraint(
    Number.isInteger(config.chunks.cols) && config.chunks.cols > 0 &&
      Number.isInteger(config.chunks.behind) && config.chunks.behind >= 0 &&
      Number.isInteger(config.chunks.ahead) && config.chunks.ahead > 0 &&
      Number.isInteger(config.chunks.gpuUploadSteady) && config.chunks.gpuUploadSteady > 0,
    'параметры чанков должны сохранять положительный размер и хотя бы одну GPU-загрузку за кадр.',
  );
  assertConfigConstraint(
    config.wave.sizePx > 0 && config.wave.pixelSizePx > 0 && config.wave.durationSec > 0,
    'размер пикселя, размер волны и её длительность должны быть больше нуля.',
  );
  assertConfigConstraint(
    config.wave.fadeInEnd >= 0 && config.wave.fadeInEnd <= 1 &&
      config.wave.fadeOutStart >= 0 && config.wave.fadeOutStart <= 1,
    'границы появления и исчезновения волны должны быть от 0 до 1.',
  );
  assertConfigConstraint(
    config.camera.fov > 0 && config.camera.fov < 180 &&
      config.camera.near > 0 && config.camera.far > config.camera.near,
    'камера должна иметь FOV от 0 до 180 градусов и корректные near/far.',
  );
  assertConfigConstraint(
    config.camera.framingMargin >= 1 &&
      config.camera.swipeInertiaDrag > 0 && config.camera.swipeInertiaDrag < 1 &&
      config.camera.swipeFrameDeltaMaxSec > 0,
    'параметры кадрирования и инерции камеры должны быть положительными; drag должен быть меньше 1.',
  );
  assertConfigConstraint(
    config.labels.scale > 0 && config.labels.padding >= 0 && config.labels.raise >= 0,
    'масштаб и отступы подписей не должны быть отрицательными или нулевыми для масштаба.',
  );
  assertConfigConstraint(
    config.holdRepeat.tickMs > 0 && config.holdRepeat.startDelayMs >= 0,
    'повтор движения должен иметь положительный интервал.',
  );
  const glow = config.lighting.objectGlow;
  assertConfigConstraint(
    glow.fallbackIntensity >= 0 && glow.fallbackDistance > 0 &&
      glow.heightAbovePlatform > 0 && glow.decay >= 0 &&
      glow.minimumVisibleIntensity >= 0 && glow.minimumVisibleIntensity <= 1,
    'параметры свечения объекта должны быть неотрицательными, а радиус и высота — положительными.',
  );
  assertConfigConstraint(
    glow.flicker.slowIntervalMs > 0 &&
      glow.flicker.mediumIntervalMs > 0 &&
      glow.flicker.fastIntervalMs > 0 &&
      glow.flicker.roundingScale > 0,
    'интервалы мерцания и масштаб округления должны быть больше нуля.',
  );
  assertConfigConstraint(
    glow.pixelOverlay.pixelSizePx > 0 &&
      glow.pixelOverlay.maxAlpha >= 0 && glow.pixelOverlay.maxAlpha <= 1,
    'пиксельное свечение должно иметь положительный размер, а maxAlpha — значение от 0 до 1.',
  );
  const shadows = config.lighting.shadows;
  assertConfigConstraint(
    Number.isInteger(shadows.mapSizePx) && shadows.mapSizePx > 0 &&
      shadows.cameraLeft < shadows.cameraRight &&
      shadows.cameraTop > shadows.cameraBottom &&
      shadows.cameraNear > 0 && shadows.cameraFar > shadows.cameraNear,
    'параметры shadow-камеры должны описывать корректный объём и положительное разрешение.',
  );
  assertConfigConstraint(
    shadows.emitterSaturationIntensity > 0 &&
      shadows.minIntensity >= 0 && shadows.minIntensity <= shadows.maxIntensity &&
      shadows.maxIntensity <= 1,
    'границы интенсивности теней должны быть упорядочены от 0 до 1.',
  );
}

/** Create a portable, versioned JSON document from the active merged configuration. */
export function serializeFieldConfigJson(config: FieldConfig): string {
  return JSON.stringify(
    {
      format: FIELD_CONFIG_JSON_FORMAT,
      version: FIELD_CONFIG_JSON_VERSION,
      exportedAt: new Date().toISOString(),
      config,
    },
    null,
    2,
  );
}

/**
 * Parse a current or older config JSON file.
 * Missing newly-added fields are allowed and filled from current defaults;
 * unknown or incorrectly typed fields are rejected to avoid silent corruption.
 */
export function parseFieldConfigJson(content: string): FieldConfig {
  let decoded: unknown;
  try {
    decoded = JSON.parse(content) as unknown;
  } catch {
    throw new Error('Файл не содержит корректный JSON.');
  }

  if (!isJsonObject(decoded)) {
    throw new Error('JSON должен содержать объект конфигурации.');
  }

  let rawConfig: unknown = decoded;
  if ('format' in decoded || 'version' in decoded || 'config' in decoded) {
    if (decoded.format !== FIELD_CONFIG_JSON_FORMAT) {
      throw new Error('Это не файл конфигурации поля Twilite.');
    }
    if (decoded.version !== FIELD_CONFIG_JSON_VERSION) {
      throw new Error(`Неподдерживаемая версия конфигурации: ${String(decoded.version)}.`);
    }
    rawConfig = decoded.config;
  }

  const overrides = validateValue(
    rawConfig,
    DEFAULT_FIELD_CONFIG as unknown as DeepPartial<FieldConfig>,
    '',
  ) as FieldConfigOverrides;

  const config = mergeFieldConfig(overrides);
  validateConfigConstraints(config);
  return config;
}

