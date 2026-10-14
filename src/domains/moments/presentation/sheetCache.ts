import { cachedImageFile } from '@/infrastructure/assets/cachedImageFile';

export function cachedSheetFile(
  url: string,
  headers: Readonly<Record<string, string>>,
): Promise<string> {
  return cachedImageFile(url, headers);
}
