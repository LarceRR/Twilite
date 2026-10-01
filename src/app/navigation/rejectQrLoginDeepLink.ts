/**
 * Incoming OS URLs that carry a QR login secret. These must never become
 * in-app routes: another Android app can register the same custom scheme.
 */
export function isExternalQrLoginPath(path: string): boolean {
  const value = path.trim();
  if (value.length === 0) {
    return false;
  }

  if (/(?:^|[?&])token=/i.test(value)) {
    return true;
  }

  try {
    const url = new URL(value.includes('://') ? value : `twilite://${value.replace(/^\/+/, '')}`);
    const hostOrPath = url.hostname || url.pathname.replace(/^\//, '').split('/')[0];
    if (url.protocol === 'twilite:' && hostOrPath === 'login') {
      return true;
    }
  } catch {
    // Not a URL — fall through to path matching.
  }

  const withoutScheme = value.replace(/^twilite:\/\//i, '').replace(/^\/+/, '');
  const route = withoutScheme.split('?')[0] ?? '';
  return route === 'login';
}
