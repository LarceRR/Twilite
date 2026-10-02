import type { PixelObjectMobileDto } from './pixelObjects';
import { PIXEL_OBJECT_FORMAT } from './limits';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isNonNegInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseSheet(raw: unknown): PixelObjectMobileDto['sheet'] | null {
  if (!isRecord(raw)) return null;
  if (
    !isPositiveInt(raw.frameWidth) ||
    !isPositiveInt(raw.frameHeight) ||
    !isPositiveInt(raw.columns) ||
    !isPositiveInt(raw.rows) ||
    !isPositiveInt(raw.frameCount)
  ) {
    return null;
  }
  return {
    frameWidth: raw.frameWidth,
    frameHeight: raw.frameHeight,
    columns: raw.columns,
    rows: raw.rows,
    frameCount: raw.frameCount,
  };
}

function parseAnimations(
  raw: unknown,
): PixelObjectMobileDto['animations'] | null {
  if (!Array.isArray(raw) || raw.length !== 1) return null;
  const animation = raw[0];
  if (!isRecord(animation) || animation.id !== 'default' || animation.loop !== true) {
    return null;
  }
  if (!Array.isArray(animation.frames) || animation.frames.length < 1) return null;
  const frames: { frame: number; durationMs: number }[] = [];
  for (const entry of animation.frames) {
    if (!isRecord(entry) || !isNonNegInt(entry.frame) || !isPositiveInt(entry.durationMs)) {
      return null;
    }
    frames.push({ frame: entry.frame, durationMs: entry.durationMs });
  }
  return [{ id: 'default', loop: true, frames }];
}

/** Lightweight runtime parse for mobile DTO (no Zod; P0-S7 / P4-S1). */
export function parsePixelObjectMobileDto(raw: unknown): PixelObjectMobileDto | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.title)) return null;
  if (raw.format !== PIXEL_OBJECT_FORMAT) return null;
  if (!isNonEmptyString(raw.sheetUrl)) return null;
  if (!isRecord(raw.canvas) || !isPositiveInt(raw.canvas.width) || !isPositiveInt(raw.canvas.height)) {
    return null;
  }
  const sheet = parseSheet(raw.sheet);
  const animations = parseAnimations(raw.animations);
  if (sheet === null || animations === null) return null;
  if (!isNonNegInt(raw.staticPreviewFrame)) return null;

  const dto: PixelObjectMobileDto = {
    id: raw.id,
    title: raw.title,
    format: PIXEL_OBJECT_FORMAT,
    sheetUrl: raw.sheetUrl,
    canvas: { width: raw.canvas.width, height: raw.canvas.height },
    sheet,
    animations,
    staticPreviewFrame: raw.staticPreviewFrame,
  };

  if (typeof raw.revision === 'number' && Number.isInteger(raw.revision) && raw.revision >= 1) {
    return { ...dto, revision: raw.revision };
  }
  if (raw.previewUrl === null || typeof raw.previewUrl === 'string') {
    return { ...dto, previewUrl: raw.previewUrl ?? null };
  }
  return dto;
}

export type ParseFailure = { readonly ok: false; readonly reason: string };
export type ParseSuccess<T> = { readonly ok: true; readonly value: T };

export function tryParsePixelObjectMobile(
  raw: unknown,
): ParseSuccess<PixelObjectMobileDto> | ParseFailure {
  const value = parsePixelObjectMobileDto(raw);
  if (value === null) {
    return { ok: false, reason: 'invalid_mobile_dto' };
  }
  return { ok: true, value };
}
