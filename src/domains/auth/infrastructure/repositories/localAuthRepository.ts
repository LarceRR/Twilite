import { DomainError } from '@/shared/errors';
import { createLocalId } from '@/shared/utils/id';

import type { LocalBackend } from '@/infrastructure/local/localBackend';

import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { nativeDeviceInfo } from '../deviceInfo';

const SANDBOX_SESSION_ID = '00000000-0000-4000-8000-000000000001';
const SANDBOX_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sandboxQrLogin(): never {
  throw new DomainError('QR-вход недоступен без сервера');
}

/**
 * Sandbox auth. OAuth is accepted without verification because no identity
 * provider is reachable offline; the HTTP adapter performs the real exchange.
 * Avatars store the local file URI on the profile — no R2 in sandbox.
 */
export function createLocalAuthRepository(backend: LocalBackend): AuthRepository {
  return {
    signIn: (credentials) =>
      credentials.type === 'email'
        ? backend.signIn({ email: credentials.email, password: credentials.password })
        : backend.signInAnonymously(),

    signUp: (credentials) =>
      backend.signUp({
        email: credentials.email,
        password: credentials.password,
        displayName: credentials.displayName,
      }),

    refresh: () => backend.signInAnonymously(),

    signOut: async () => {
      // Nothing to revoke locally; the session storage is cleared by the use case.
    },

    profile: (session) => backend.profile(session.userId),

    updateProfile: (patch) => backend.updateProfile(patch),

    createAvatarUpload: async () => {
      const assetId = createLocalId('avt');
      return {
        assetId,
        uploadUrl: `local-avatar://${assetId}`,
        storageKey: assetId,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      };
    },

    confirmAvatar: async () => {
      throw new DomainError('В офлайн-режиме подтверждение загрузки не используется');
    },

    inspectQrLogin: async () => sandboxQrLogin(),
    approveQrLogin: async () => sandboxQrLogin(),
    denyQrLogin: async () => sandboxQrLogin(),

    listSessions: async () => {
      const device = nativeDeviceInfo();
      const now = new Date().toISOString();

      return [
        {
          id: SANDBOX_SESSION_ID,
          platform: device.platform,
          model: device.model ?? null,
          appVersion: device.appVersion ?? null,
          ipLabel: '127.0.0.x',
          createdAt: now,
          lastUsedAt: now,
          expiresAt: new Date(Date.now() + SANDBOX_SESSION_TTL_MS).toISOString(),
          current: true,
        },
      ];
    },

    revokeSession: async () => {
      // Sandbox has a single synthetic session; clearing happens via sign-out.
    },

    revokeAllSessions: async () => {
      // Sandbox has a single synthetic session; clearing happens via sign-out.
    },
  };
}
