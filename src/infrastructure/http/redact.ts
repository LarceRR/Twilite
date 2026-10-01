const SECRET_KEYS = new Set([
  'token',
  'password',
  'refreshToken',
  'accessToken',
  'pollToken',
  'qrPayload',
  'idToken',
  'authorization',
]);

export function redactForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactForLog);
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
    if (SECRET_KEYS.has(key)) {
      return [key, '[redacted]'] as const;
    }
    return [key, redactForLog(nested)] as const;
  });

  return Object.fromEntries(entries);
}
