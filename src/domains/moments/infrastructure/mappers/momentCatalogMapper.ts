import { ValidationError } from '@/shared/errors';

import type {
  MomentCatalogPage,
  MomentCatalogQuery,
  MomentFrame,
  MomentPack,
  MomentPreview,
  MomentSprite,
} from '../../domain/entities/MomentCatalog';
import { catalogAssetUrl } from './catalogAssetUrl';

const UUID_TEXT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_FRAMES = 256;
const CANVAS_MAX = 160;
const MOMENTS_PER_PROJECT = 4;

export function catalogSearchParams(
  query: MomentCatalogQuery,
): Readonly<Record<string, string | number>> {
  const params: Record<string, string | number> = {
    objectType: query.kind === 'good' ? 'Good' : 'Bad',
    limit: query.limit ?? 8,
  };
  if (typeof query.cursor === 'string' && query.cursor.length > 0) {
    params.cursor = query.cursor;
  }
  const text = query.query?.trim().slice(0, 80);
  if (text !== undefined && text.length > 0) params.q = text;
  return params;
}

export function parseMomentCatalogPage(raw: unknown, baseUrl: string): MomentCatalogPage {
  if (!isRecord(raw) || !Array.isArray(raw.items)) {
    throw new ValidationError('Каталог пришёл в неожиданном виде');
  }
  return {
    packs: raw.items.flatMap((item) => {
      const pack = parsePack(item, baseUrl);
      return pack === null ? [] : [pack];
    }),
    nextCursor:
      typeof raw.nextCursor === 'string' && raw.nextCursor.length > 0 ? raw.nextCursor : null,
  };
}

function parsePack(raw: unknown, baseUrl: string): MomentPack | null {
  if (!isRecord(raw) || !UUID_TEXT.test(readString(raw.id) ?? '')) return null;
  const title = readBounded(raw.title, 80);
  const author = readBounded(raw.authorDisplayName, 80);
  if (title === null || author === null || !Array.isArray(raw.moments)) return null;
  const moments = raw.moments.flatMap((item) => {
    const moment = parseMoment(item, baseUrl);
    return moment === null ? [] : [moment];
  });
  return {
    id: String(raw.id),
    title,
    author,
    official: raw.official === true,
    avatarUrl: catalogAssetUrl(baseUrl, raw.avatarUrl),
    objectCount: readCount(raw.objectCount),
    byteSize: readCount(raw.byteSize),
    moments: moments.slice(0, MOMENTS_PER_PROJECT),
  };
}

function parseMoment(raw: unknown, baseUrl: string): MomentPreview | null {
  if (!isRecord(raw) || !UUID_TEXT.test(readString(raw.id) ?? '')) return null;
  const name = readBounded(raw.title, 80);
  if (name === null) return null;
  return {
    id: String(raw.id),
    name,
    previewUrl: catalogAssetUrl(baseUrl, raw.previewUrl),
    sprite: parseSprite(raw.sprite, baseUrl),
  };
}

function parseSprite(raw: unknown, baseUrl: string): MomentSprite | null {
  const layout = readSpriteLayout(raw, baseUrl);
  if (layout === null) return null;
  const frames = readFrames(raw && isRecord(raw) ? raw.frames : null, layout.frameCount);
  if (frames === null) return null;
  return { ...layout, frames };
}

function readSpriteLayout(raw: unknown, baseUrl: string): Omit<MomentSprite, 'frames'> | null {
  if (!isRecord(raw)) return null;
  const sheetUrl = catalogAssetUrl(baseUrl, raw.sheetUrl);
  const frameWidth = readInt(raw.frameWidth, 1, CANVAS_MAX);
  const frameHeight = readInt(raw.frameHeight, 1, CANVAS_MAX);
  const columns = readInt(raw.columns, 1, MAX_FRAMES);
  const rows = readInt(raw.rows, 1, MAX_FRAMES);
  const frameCount = readInt(raw.frameCount, 1, MAX_FRAMES);
  const staticPreviewFrame = readInt(raw.staticPreviewFrame, 0, MAX_FRAMES);
  if (
    sheetUrl === null ||
    frameWidth === null ||
    frameHeight === null ||
    columns === null ||
    rows === null ||
    frameCount === null ||
    staticPreviewFrame === null ||
    staticPreviewFrame >= frameCount
  ) {
    return null;
  }
  return { sheetUrl, frameWidth, frameHeight, columns, rows, frameCount, staticPreviewFrame };
}

function readFrames(raw: unknown, frameCount: number): readonly MomentFrame[] | null {
  if (!Array.isArray(raw) || raw.length !== frameCount) return null;
  const frames: MomentFrame[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) return null;
    const frame = readInt(entry.frame, 0, frameCount - 1);
    const durationMs = readInt(entry.durationMs, 16, 10_000);
    if (frame === null || durationMs === null) return null;
    frames.push({ frame, durationMs });
  }
  return frames;
}

function readCount(value: unknown): number {
  const parsed = readInt(value, 0, Number.MAX_SAFE_INTEGER);
  return parsed ?? 0;
}

function readInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function readBounded(value: unknown, max: number): string | null {
  const text = readString(value);
  if (text === null) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
