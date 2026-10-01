import { isExternalQrLoginPath } from '@/app/navigation/rejectQrLoginDeepLink';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (isExternalQrLoginPath(path)) {
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}
