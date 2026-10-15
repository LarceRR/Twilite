import * as FileSystem from 'expo-file-system/legacy';
import { File, FileMode } from 'expo-file-system';
import { inflateRawSync } from 'fflate';

import type {
  FieldMaterialMapKey,
  FieldMaterialMaps,
  FieldMaterialProvider,
  FieldMaterialResolution,
} from './fieldMaterialStore';

export type FieldMaterialAsset = {
  readonly provider: FieldMaterialProvider;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly previewUrl: string | null;
  readonly availableResolutions: readonly FieldMaterialResolution[];
};

export type DownloadedFieldMaterial = {
  readonly maps: FieldMaterialMaps;
  readonly downloadedBytes: number;
};

const AMBIENT_API_V3 = 'https://ambientCG.com/api/v3/assets';
const AMBIENT_API_V2 = 'https://ambientCG.com/api/v2/full_json';
const POLYHAVEN_API = 'https://api.polyhaven.com';
const POLYHAVEN_USER_AGENT = 'TwiliteMaterialLab/1.0 (developer material browser)';
const RESOLUTIONS: readonly FieldMaterialResolution[] = ['1K', '2K', '4K', '8K'];
const MAP_ORDER: readonly FieldMaterialMapKey[] = [
  'color',
  'normal',
  'roughness',
  'metalness',
  'ao',
  'bump',
  'displacement',
  'emissive',
];

export async function searchFieldMaterialAssets(
  provider: FieldMaterialProvider,
  query: string,
  limit = 40,
): Promise<readonly FieldMaterialAsset[]> {
  const normalizedQuery = query.trim();
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  if (provider === 'ambientCG') {
    const url = new URL(AMBIENT_API_V3);
    url.searchParams.set('type', 'material');
    url.searchParams.set('q', normalizedQuery);
    url.searchParams.set('limit', String(safeLimit));
    url.searchParams.set('include', 'title,shortDescription,tags,previews,downloads,maps');
    try {
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('ambientCG API v3 вернул HTTP ' + response.status);
      const assets = normalizeAmbientAssets(await response.json());
      if (assets.length > 0) return assets.slice(0, safeLimit);
    } catch {
      // Fall back to the established v2 endpoint if v3 is temporarily unavailable
      // or its schema changes. The UI still identifies the provider as ambientCG.
    }

    const fallback = new URL(AMBIENT_API_V2);
    fallback.searchParams.set('type', 'Material');
    fallback.searchParams.set('q', normalizedQuery);
    fallback.searchParams.set('limit', String(safeLimit));
    fallback.searchParams.set('offset', '0');
    fallback.searchParams.set('include', 'imageData,downloadData');
    const response = await fetch(fallback.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('ambientCG API вернул HTTP ' + response.status);
    return normalizeAmbientAssets(await response.json()).slice(0, safeLimit);
  }

  const response = await fetch(POLYHAVEN_API + '/assets?type=textures', {
    headers: { Accept: 'application/json', 'User-Agent': POLYHAVEN_USER_AGENT },
  });
  if (!response.ok) throw new Error('Poly Haven API вернул HTTP ' + response.status);
  const payload: unknown = await response.json();
  const assets = normalizePolyHavenAssets(payload);
  const queryWords = normalizedQuery.toLowerCase().split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return assets.slice(0, safeLimit);
  return assets
    .map((asset) => ({
      asset,
      score: queryWords.reduce((score, word) => {
        const haystack = [asset.name, asset.description, asset.category, ...asset.tags]
          .join(' ')
          .toLowerCase();
        return score + (haystack.includes(word) ? 1 : 0);
      }, 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.asset.name.localeCompare(right.asset.name))
    .slice(0, safeLimit)
    .map((entry) => entry.asset);
}

export async function downloadFieldMaterialAsset(
  asset: FieldMaterialAsset,
  resolution: FieldMaterialResolution,
): Promise<DownloadedFieldMaterial> {
  if (asset.provider === 'ambientCG') return downloadAmbientCgAsset(asset, resolution);
  return downloadPolyHavenAsset(asset, resolution);
}

export function normalizeAmbientAssets(payload: unknown): readonly FieldMaterialAsset[] {
  const rows = extractRows(payload);
  const seen = new Set<string>();
  const result: FieldMaterialAsset[] = [];
  for (const row of rows) {
    const id = firstString(row, ['assetId', 'assetID', 'id', 'slug']);
    const name = firstString(row, ['displayName', 'name', 'title', 'assetName']) ?? id;
    if (id === null || name === null || seen.has(id)) continue;
    seen.add(id);
    const rawTags = row.tags;
    const tags = Array.isArray(rawTags)
      ? rawTags.filter((value): value is string => typeof value === 'string')
      : typeof rawTags === 'string' ? rawTags.split(/[;,]/).map((value) => value.trim()).filter(Boolean) : [];
    const previewValue =
      firstString(row, ['previewImage', 'thumbnail', 'thumbnail_url', 'previewUrl', 'imageUrl']) ??
      findPreviewUrl(row.previews) ??
      findPreviewUrl(row.thumbnails) ??
      findPreviewUrl(row.previewData) ??
      findPreviewUrl(row.imageData);
    const description = firstString(row, ['shortDescription', 'description', 'displayDescription']) ?? '';
    const category = firstString(row, ['displayCategory', 'category', 'assetType']) ?? 'Material';
    result.push({
      provider: 'ambientCG',
      id,
      name,
      description,
      category,
      tags,
      previewUrl: normalizeProviderUrl(previewValue, 'ambientCG'),
      availableResolutions: extractResolutions(row),
    });
  }
  return result;
}

export function normalizePolyHavenAssets(payload: unknown): readonly FieldMaterialAsset[] {
  if (!isRecord(payload)) return [];
  const result: FieldMaterialAsset[] = [];
  for (const [id, value] of Object.entries(payload)) {
    if (!isRecord(value)) continue;
    const typeValue = value.type;
    if (typeValue !== 1 && String(typeValue).toLowerCase() !== 'texture') continue;
    result.push({
      provider: 'Poly Haven',
      id,
      name: firstString(value, ['name', 'title']) ?? id.replace(/_/g, ' '),
      description: firstString(value, ['description']) ?? '',
      category: firstString(value, ['category']) ?? 'Textures',
      tags: Array.isArray(value.tags)
        ? value.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      previewUrl: firstString(value, ['thumbnail_url', 'previewUrl', 'thumbnail']),
      availableResolutions: RESOLUTIONS,
    });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

async function downloadAmbientCgAsset(
  asset: FieldMaterialAsset,
  resolution: FieldMaterialResolution,
): Promise<DownloadedFieldMaterial> {
  const root = requireFileRoot();
  const directory = root + 'field-materials/' + sanitizeFilename(asset.id) + '/' + resolution + '/';
  const cacheDirectory = root + 'field-materials/archive-cache/';
  await ensureDirectory(directory);
  await ensureDirectory(cacheDirectory);
  const archiveUri = cacheDirectory + sanitizeFilename(asset.id) + '-' + resolution + '-JPG.zip';
  const downloadUrl = 'https://ambientCG.com/get?file=' +
    encodeURIComponent(asset.id + '_' + resolution + '-JPG.zip');
  const download = await FileSystem.downloadAsync(downloadUrl, archiveUri);
  if (download.status < 200 || download.status >= 300) {
    throw new Error('Не удалось скачать архив ambientCG (HTTP ' + download.status + '). Проверь разрешение материала.');
  }

  const zipFile = new File(download.uri);
  const handle = zipFile.open(FileMode.ReadOnly);
  const written: Partial<Record<FieldMaterialMapKey, string>> = {};
  let downloadedBytes = 0;
  try {
    const entries = readZipCentralDirectory(handle);
    const selected = selectAmbientEntries(entries);
    for (const key of MAP_ORDER) {
      const entry = selected[key];
      if (entry === undefined) continue;
      const bytes = readZipEntry(handle, entry);
      const path = directory + key + extensionFor(entry.name);
      await FileSystem.writeAsStringAsync(path, bytesToBase64(bytes), {
        encoding: FileSystem.EncodingType.Base64,
      });
      written[key] = path;
      downloadedBytes += bytes.byteLength;
    }
  } finally {
    handle.close();
    await FileSystem.deleteAsync(download.uri, { idempotent: true }).catch(() => undefined);
  }

  if (Object.keys(written).length === 0) {
    throw new Error('В архиве ambientCG не найдены поддерживаемые карты материала.');
  }
  return { maps: written, downloadedBytes };
}

async function downloadPolyHavenAsset(
  asset: FieldMaterialAsset,
  resolution: FieldMaterialResolution,
): Promise<DownloadedFieldMaterial> {
  const response = await fetch(
    POLYHAVEN_API + '/files/' + encodeURIComponent(asset.id),
    { headers: { Accept: 'application/json', 'User-Agent': POLYHAVEN_USER_AGENT } },
  );
  if (!response.ok) throw new Error('Poly Haven files API вернул HTTP ' + response.status);
  const payload: unknown = await response.json();
  const candidates = flattenPolyHavenFiles(payload);
  const selected = selectPolyHavenFiles(candidates, resolution);
  if (selected.color === undefined && selected.normal === undefined && selected.roughness === undefined) {
    throw new Error('Poly Haven не вернул доступные карты материала для выбранного разрешения.');
  }

  const root = requireFileRoot();
  const directory = root + 'field-materials/' + sanitizeFilename(asset.id) + '/' + resolution + '/';
  await ensureDirectory(directory);
  const maps: Partial<Record<FieldMaterialMapKey, string>> = {};
  let downloadedBytes = 0;
  for (const key of MAP_ORDER) {
    const file = selected[key];
    if (file === undefined) continue;
    const destination = directory + key + extensionFor(file.url);
    const download = await FileSystem.downloadAsync(file.url, destination, {
      headers: { 'User-Agent': POLYHAVEN_USER_AGENT },
    });
    if (download.status < 200 || download.status >= 300) {
      throw new Error('Не удалось скачать карту ' + key + ' (HTTP ' + download.status + ').');
    }
    maps[key] = download.uri;
    downloadedBytes += file.size ?? 0;
  }
  return { maps, downloadedBytes };
}

type ZipEntry = {
  readonly name: string;
  readonly compressionMethod: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localHeaderOffset: number;
};

function readZipCentralDirectory(handle: ReturnType<File['open']>): readonly ZipEntry[] {
  const size = handle.size;
  if (size === null || size < 22) throw new Error('Архив ambientCG пустой или повреждён.');
  const tailLength = Math.min(size, 65_557);
  handle.offset = size - tailLength;
  const tail = handle.readBytes(tailLength);
  const tailView = dataView(tail);
  let endOffset = -1;
  for (let offset = tail.byteLength - 22; offset >= 0; offset -= 1) {
    if (tailView.getUint32(offset, true) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error('Не найдена ZIP central directory.');
  const directorySize = tailView.getUint32(endOffset + 12, true);
  const directoryOffset = tailView.getUint32(endOffset + 16, true);
  if (directorySize === 0xffff_ffff || directoryOffset === 0xffff_ffff) {
    throw new Error('ZIP64 архивы пока не поддерживаются этим предпросмотром.');
  }
  handle.offset = directoryOffset;
  const central = handle.readBytes(directorySize);
  const view = dataView(central);
  const entries: ZipEntry[] = [];
  let cursor = 0;
  while (cursor + 46 <= central.byteLength && view.getUint32(cursor, true) === 0x02014b50) {
    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const nameStart = cursor + 46;
    const nameBytes = central.slice(nameStart, nameStart + nameLength);
    const name = Array.from(nameBytes, (byte) => String.fromCharCode(byte)).join('');
    if (localHeaderOffset !== 0xffff_ffff && compressedSize !== 0xffff_ffff) {
      entries.push({ name, compressionMethod, compressedSize, uncompressedSize, localHeaderOffset });
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readZipEntry(
  handle: ReturnType<File['open']>,
  entry: ZipEntry,
): Uint8Array {
  handle.offset = entry.localHeaderOffset;
  const header = handle.readBytes(30);
  const view = dataView(header);
  if (view.getUint32(0, true) !== 0x04034b50) throw new Error('Повреждён локальный заголовок ZIP.');
  const nameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  handle.offset = entry.localHeaderOffset + 30 + nameLength + extraLength;
  const compressed = handle.readBytes(entry.compressedSize);
  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) return inflateRawSync(compressed);
  throw new Error('Не поддерживается метод сжатия ZIP: ' + entry.compressionMethod);
}

function selectAmbientEntries(
  entries: readonly ZipEntry[],
): Partial<Record<FieldMaterialMapKey, ZipEntry>> {
  const result: Partial<Record<FieldMaterialMapKey, ZipEntry>> = {};
  for (const entry of entries) {
    const key = inferMapKey(entry.name);
    if (key === null || result[key] !== undefined) continue;
    result[key] = entry;
  }
  return result;
}

type PolyFileCandidate = { readonly path: string; readonly url: string; readonly size?: number };

function flattenPolyHavenFiles(payload: unknown): readonly PolyFileCandidate[] {
  const result: PolyFileCandidate[] = [];
  const visit = (value: unknown, path: readonly string[]): void => {
    if (!isRecord(value)) return;
    if (typeof value.url === 'string' && /^https:\/\//i.test(value.url)) {
      result.push({
        path: [...path, value.url].join('/'),
        url: value.url,
        ...(typeof value.size === 'number' ? { size: value.size } : {}),
      });
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, [...path, key]);
  };
  visit(payload, []);
  return result;
}

function selectPolyHavenFiles(
  candidates: readonly PolyFileCandidate[],
  resolution: FieldMaterialResolution,
): Partial<Record<FieldMaterialMapKey, PolyFileCandidate>> {
  const result: Partial<Record<FieldMaterialMapKey, PolyFileCandidate>> = {};
  for (const candidate of candidates) {
    const mapKey = inferMapKey(candidate.path);
    if (mapKey === null) continue;
    const previous = result[mapKey];
    const candidateScore = resolutionCandidateScore(candidate.path, resolution, mapKey);
    const previousScore = previous === undefined ? Number.NEGATIVE_INFINITY :
      resolutionCandidateScore(previous.path, resolution, mapKey);
    if (candidateScore > previousScore) result[mapKey] = candidate;
  }
  return result;
}

function resolutionCandidateScore(
  path: string,
  requested: FieldMaterialResolution,
  mapKey: FieldMaterialMapKey,
): number {
  const lower = path.toLowerCase();
  const requestedIndex = Number.parseInt(requested, 10);
  const match = /(?:^|[/_.-])(1k|2k|4k|8k)(?:[/_.-]|$)/i.exec(lower);
  if (match === null) return -10;
  const foundIndex = Number.parseInt(match[1] ?? '0', 10);
  const resolutionScore = foundIndex === requestedIndex ? 1000 : -Math.abs(foundIndex - requestedIndex) * 100;
  const extension = /\.([a-z0-9]+)(?:\?|$)/i.exec(lower)?.[1] ?? '';
  const formatScore = mapKey === 'color'
    ? (extension === 'jpg' || extension === 'jpeg' ? 30 : extension === 'png' ? 20 : 0)
    : (extension === 'png' ? 30 : extension === 'jpg' || extension === 'jpeg' ? 20 : 0);
  const normalFormatScore = mapKey === 'normal'
    ? (lower.includes('nor_gl') || lower.includes('normalgl') ? 40 : lower.includes('nor_dx') || lower.includes('normaldx') ? -20 : 0)
    : 0;
  return resolutionScore + formatScore + normalFormatScore;
}

function inferMapKey(value: string): FieldMaterialMapKey | null {
  const lower = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/(normalgl|normaldx|normalmap|normal|norgl|nordx)/.test(lower)) return 'normal';
  if (/(ambientocclusion|occlusion|ao(map)?)/.test(lower)) return 'ao';
  if (/(roughness|rough(map)?)/.test(lower)) return 'roughness';
  if (/(metalness|metallic|metal(map)?)/.test(lower)) return 'metalness';
  if (/(displacement|height(map)?|disp(map)?)/.test(lower)) return 'displacement';
  if (/(bump(map)?)/.test(lower)) return 'bump';
  if (/(emissive|emission|emit(map)?)/.test(lower)) return 'emissive';
  if (/(basecolor|basecolour|diffuse|albedo|color(map)?|colour(map)?)/.test(lower)) return 'color';
  return null;
}

function extractResolutions(row: Record<string, unknown>): readonly FieldMaterialResolution[] {
  const text = JSON.stringify(row).toUpperCase();
  const found = RESOLUTIONS.filter((resolution) => text.includes(resolution));
  return found.length > 0 ? found : RESOLUTIONS;
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  for (const key of ['assets', 'results', 'foundAssets', 'items', 'data']) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate.filter(isRecord);
    if (isRecord(candidate)) {
      return Object.entries(candidate)
        .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
        .map(([id, value]) => ({ id, ...value }));
    }
  }
  return Object.entries(payload)
    .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
    .map(([id, value]) => ({ id, ...value }));
}

function firstString(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

function findPreviewUrl(value: unknown, depth = 0): string | null {
  if (depth > 5 || value === null || value === undefined) return null;
  if (typeof value === 'string') {
    if (!/^https:\/\//i.test(value)) return null;
    const normalized = value.toLowerCase();
    const path = normalized.split(/[?#]/, 1)[0] ?? normalized;
    const fileQuery = /[?&](?:file|filename)=([^&]+)/i.exec(value)?.[1];
    const queryPath = fileQuery === undefined ? '' : decodeURIComponent(fileQuery).toLowerCase();
    return /\.(png|jpe?g|webp)$/i.test(path) || /\.(png|jpe?g|webp)$/i.test(queryPath)
      ? value
      : null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = findPreviewUrl(entry, depth + 1);
      if (result !== null) return result;
    }
    return null;
  }
  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (/thumbnail|preview|image|jpg|jpeg|png|webp/i.test(key)) {
        const result = findPreviewUrl(entry, depth + 1);
        if (result !== null) return result;
      }
    }
    for (const entry of Object.values(value)) {
      const result = findPreviewUrl(entry, depth + 1);
      if (result !== null) return result;
    }
  }
  return null;
}

function normalizeProviderUrl(value: string | null, provider: FieldMaterialProvider): string | null {
  if (value === null) return null;
  if (/^https:\/\//i.test(value)) return value;
  if (provider === 'ambientCG') return 'https://ambientcg.com' + (value.startsWith('/') ? value : '/' + value);
  return null;
}

function extensionFor(value: string): string {
  const pathname = value.split(/[?#]/, 1)[0] ?? value;
  return /\.[a-z0-9]{2,5}$/i.exec(pathname)?.[0] ?? '.bin';
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100) || 'material';
}

function requireFileRoot(): string {
  const root = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (root === null) throw new Error('Недоступна папка для сохранения материалов.');
  return root.endsWith('/') ? root : root + '/';
}

async function ensureDirectory(uri: string): Promise<void> {
  await FileSystem.makeDirectoryAsync(uri, { intermediates: true }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists|file exists/i.test(message)) throw error;
  });
}

function dataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  const chunkSize = 0x6000;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    const end = Math.min(bytes.length, start + chunkSize);
    let chunk = '';
    for (let index = start; index < end; index += 3) {
      const a = bytes[index] ?? 0;
      const hasB = index + 1 < end;
      const hasC = index + 2 < end;
      const b = hasB ? bytes[index + 1]! : 0;
      const c = hasC ? bytes[index + 2]! : 0;
      chunk += alphabet[a >> 2];
      chunk += alphabet[((a & 3) << 4) | (b >> 4)];
      chunk += hasB ? alphabet[((b & 15) << 2) | (c >> 6)] : '=';
      chunk += hasC ? alphabet[c & 63] : '=';
    }
    output += chunk;
  }
  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
