import * as FileSystem from 'expo-file-system/legacy';

import { sheetCacheLeaf } from './spritePlayback';

const inflight = new Map<string, Promise<string>>();

export function cachedSheetFile(
  url: string,
  headers: Readonly<Record<string, string>>,
): Promise<string> {
  const existing = inflight.get(url);
  if (existing !== undefined) return existing;
  const task = downloadSheet(url, headers).catch((error: unknown) => {
    inflight.delete(url);
    throw error;
  });
  inflight.set(url, task);
  return task;
}

async function downloadSheet(
  url: string,
  headers: Readonly<Record<string, string>>,
): Promise<string> {
  const root = FileSystem.cacheDirectory;
  if (root === null) throw new Error('Нет каталога кэша');
  const dir = `${root}moment-sheets/`;
  await ensureDir(dir);
  const path = `${dir}${sheetCacheLeaf(url)}`;
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && info.size > 0) return path;
  const result = await FileSystem.downloadAsync(url, path, { headers: { ...headers } });
  return result.uri;
}

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}
