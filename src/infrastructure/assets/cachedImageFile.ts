import * as FileSystem from 'expo-file-system/legacy';

const inflight = new Map<string, Promise<string>>();

export function cachedImageFile(
  url: string,
  headers: Readonly<Record<string, string>>,
): Promise<string> {
  const existing = inflight.get(url);
  if (existing !== undefined) return existing;
  const task = downloadImage(url, headers).catch((error: unknown) => {
    inflight.delete(url);
    throw error;
  });
  inflight.set(url, task);
  return task;
}

async function downloadImage(
  url: string,
  headers: Readonly<Record<string, string>>,
): Promise<string> {
  const root = FileSystem.cacheDirectory;
  if (root === null) throw new Error('Нет каталога кэша');
  const directory = `${root}media-sheets/`;
  await ensureDirectory(directory);
  const path = `${directory}${cacheLeaf(url)}`;
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && info.size > 0) return path;
  const result = await FileSystem.downloadAsync(url, path, { headers: { ...headers } });
  return result.uri;
}

async function ensureDirectory(directory: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
}

function cacheLeaf(url: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < url.length; index += 1) {
    hash = Math.imul(hash ^ url.charCodeAt(index), 16_777_619);
  }
  return `${(hash >>> 0).toString(16)}.png`;
}