import type { ImageURISource } from 'react-native';

export type UserAvatarImageHeaders = Readonly<Record<string, string>> | null;

/**
 * Twilite's remote avatar assets require a valid session token. Avoid sending
 * an unauthenticated request while auth headers are loading; local sandbox
 * URIs remain usable without network headers.
 */
export function userAvatarImageSource(
  uri: string,
  headers: UserAvatarImageHeaders,
): ImageURISource | null {
  const normalizedUri = uri.trim();
  if (normalizedUri.length === 0) return null;

  const isRemote = /^https?:\/\//i.test(normalizedUri);
  if (isRemote && headers === null) return null;

  if (isRemote && headers !== null) {
    return {
      uri: normalizedUri,
      headers: { ...headers },
      cache: 'force-cache',
    };
  }

  return { uri: normalizedUri };
}
