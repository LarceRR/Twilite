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
  if (typeof schema === 'string' && typeof value === 'string' && path.toLowerCase().includes('color')) {
    if (!/^#[0-9a-f]{6}$/i.test(value)) {
      throw new Error(`"${path}" must be a HEX color in #RRGGBB format.`);
    }
  }
  return value;
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

  return mergeFieldConfig(overrides);
}

