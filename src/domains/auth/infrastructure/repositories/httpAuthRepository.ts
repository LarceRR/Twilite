import type { HttpClient } from '@/infrastructure/http/httpClient';
import type {
  AuthSessionDto,
  AvatarUploadTicketDto,
  QrLoginInspectResponseDto,
  SessionDto,
  UserProfileDto,
} from '@/shared/contracts';

import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { nativeDeviceInfo } from '../deviceInfo';
import { toAuthSession, toDeviceSession, toQrLoginPreview, toUserProfile } from '../mappers/authMapper';

export function createHttpAuthRepository(http: HttpClient): AuthRepository {
  const device = nativeDeviceInfo();

  return {
    async signIn(credentials) {
      const body =
        credentials.type === 'email'
          ? {
              email: credentials.email,
              password: credentials.password,
              device,
            }
          : {
              type: 'oauth',
              provider: credentials.provider,
              idToken: credentials.idToken,
              device,
            };

      return toAuthSession(await http.post<AuthSessionDto>('auth/sign-in', body));
    },

    async signUp(credentials) {
      return toAuthSession(
        await http.post<AuthSessionDto>('auth/sign-up', {
          email: credentials.email,
          password: credentials.password,
          displayName: credentials.displayName,
          device,
        }),
      );
    },

    async refresh(refreshToken) {
      return toAuthSession(await http.post<AuthSessionDto>('auth/refresh', { refreshToken }));
    },

    async signOut() {
      await http.post('auth/sign-out');
    },

    async profile() {
      return toUserProfile(await http.get<UserProfileDto>('users/me'));
    },

    async updateProfile(patch) {
      return toUserProfile(await http.patch<UserProfileDto>('users/me', patch));
    },

    async createAvatarUpload(input) {
      return http.post<AvatarUploadTicketDto>('users/me/avatar', input);
    },

    async confirmAvatar(assetId) {
      return toUserProfile(await http.post<UserProfileDto>(`users/me/avatar/${assetId}/confirm`));
    },

    async inspectQrLogin(token) {
      return toQrLoginPreview(
        await http.post<QrLoginInspectResponseDto>('auth/qr/challenges/inspect', { token }),
      );
    },

    async approveQrLogin(token) {
      await http.post('auth/qr/challenges/approve', { token });
    },

    async denyQrLogin(token) {
      await http.post('auth/qr/challenges/deny', { token });
    },

    async listSessions() {
      const dtos = await http.get<readonly SessionDto[]>('auth/sessions');
      return dtos.map(toDeviceSession);
    },

    async revokeSession(sessionId) {
      await http.delete(`auth/sessions/${sessionId}`);
    },

    async revokeAllSessions() {
      await http.delete('auth/sessions');
    },
  };
}
