const CATALOG_ASSET =
  /^\/v1\/(?:tpg\/(?:pixel-objects\/[0-9a-f-]{36}\/revisions\/\d+\/(?:sheet|preview)|projects\/[0-9a-f-]{36}\/avatar)|users\/[0-9a-f-]{36}\/avatar)$/i;

/**
 * Turn an API path into an absolute URL on our origin.
 * Anything else (bucket hosts, absolute URLs, odd paths) is dropped.
 */
export function catalogAssetUrl(baseUrl: string, path: unknown): string | null {
  if (typeof path !== 'string' || !CATALOG_ASSET.test(path)) return null;
  const origin = baseUrl.trim().replace(/\/+$/, '').replace(/\/v1$/, '');
  if (!/^https?:\/\/[^/?#]+$/i.test(origin)) return null;
  return `${origin}${path}`;
}
