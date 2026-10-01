export const QR_LOGIN_SCHEME = 'twilite';
export const QR_LOGIN_PATH = 'login';
export const QR_LOGIN_VERSION = '1';
export const QR_LOGIN_TOKEN_BYTES = 32;
export const QR_LOGIN_WIRE_PREFIX = `twilite.login.v${QR_LOGIN_VERSION}.`;

const BASE64URL = /^[A-Za-z0-9_-]+$/;

export function buildQrLoginPayload(loginToken: string): string {
  return `${QR_LOGIN_WIRE_PREFIX}${loginToken}`;
}

/**
 * Accepts the in-app wire format, a raw token, or a leftover deep link.
 * Incoming OS URLs are ignored elsewhere — this only parses camera payloads.
 */
export function parseQrLoginPayload(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > 256) {
    return null;
  }

  if (trimmed.startsWith(QR_LOGIN_WIRE_PREFIX)) {
    return decodeLoginToken(trimmed.slice(QR_LOGIN_WIRE_PREFIX.length));
  }

  if (!trimmed.includes('://')) {
    return decodeLoginToken(trimmed);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== `${QR_LOGIN_SCHEME}:`) {
    return null;
  }

  if (url.hostname !== QR_LOGIN_PATH && url.pathname.replace(/^\//, '') !== QR_LOGIN_PATH) {
    return null;
  }

  if (url.searchParams.get('v') !== QR_LOGIN_VERSION) {
    return null;
  }

  const token = url.searchParams.get('token');
  return token === null ? null : decodeLoginToken(token);
}

function decodeLoginToken(token: string): string | null {
  if (!BASE64URL.test(token)) {
    return null;
  }

  try {
    const bytes = Uint8Array.from(atob(toBase64(token)), (char) => char.charCodeAt(0));
    if (bytes.length !== QR_LOGIN_TOKEN_BYTES) {
      return null;
    }
  } catch {
    return null;
  }

  return token;
}

function toBase64(base64url: string): string {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return `${padded}${pad}`;
}
