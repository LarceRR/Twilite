import type {
  AuthSessionDto,
  QrLoginInspectResponseDto,
  SessionDto,
  UserProfileDto,
} from '@/shared/contracts';
import { UnauthorizedError } from '@/shared/errors';

import type { AuthSession } from '../../domain/entities/AuthSession';
import type { DevicePlatform, DeviceSession } from '../../domain/entities/DeviceSession';
import type { QrLoginPreview } from '../../domain/entities/QrLoginPreview';
import type { UserProfile } from '../../domain/entities/UserProfile';
import { email } from '../../domain/value-objects/Email';
import { userId } from '../../domain/value-objects/UserId';

export function toAuthSession(dto: AuthSessionDto): AuthSession {
  if (
    typeof dto.accessToken !== 'string' ||
    dto.accessToken.length === 0 ||
    typeof dto.refreshToken !== 'string' ||
    dto.refreshToken.length === 0
  ) {
    throw new UnauthorizedError('Сервер не выдал токены сессии. Войдите ещё раз.');
  }

  const expiresAt = Date.parse(dto.expiresAt);

  return {
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
    expiresAt: Number.isNaN(expiresAt) ? 0 : expiresAt,
    userId: userId(dto.userId),
  };
}

export function toUserProfile(dto: UserProfileDto): UserProfile {
  const groups =
    dto.groups === undefined
      ? []
      : dto.groups.map((group) => ({ id: group.id, name: group.name }));
  const permissions = dto.permissions === undefined ? [] : [...dto.permissions];

  return {
    id: userId(dto.id),
    email: dto.email === null ? null : email(dto.email),
    displayName: dto.displayName,
    avatarUrl: dto.avatarUrl,
    groups,
    permissions,
  };
}

export function toQrLoginPreview(dto: QrLoginInspectResponseDto): QrLoginPreview {
  return {
    challengeId: dto.challengeId,
    expiresAt: dto.expiresAt,
    requestingDevice: {
      platform: dto.requestingDevice.platform,
      model: dto.requestingDevice.model,
      appVersion: dto.requestingDevice.appVersion,
      ipLabel: dto.requestingDevice.ipLabel,
    },
  };
}

const DEVICE_PLATFORMS: readonly DevicePlatform[] = ['ios', 'android', 'web', 'unknown'];

function toDevicePlatform(value: string): DevicePlatform {
  return DEVICE_PLATFORMS.includes(value as DevicePlatform) ? (value as DevicePlatform) : 'unknown';
}

function toOptionalText(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function toDeviceSession(dto: SessionDto): DeviceSession {
  return {
    id: dto.id,
    platform: toDevicePlatform(dto.device.platform),
    model: toOptionalText(dto.device.model),
    appVersion: toOptionalText(dto.device.appVersion),
    ipLabel: toOptionalText(dto.ipLabel),
    createdAt: dto.createdAt,
    lastUsedAt: dto.lastUsedAt,
    expiresAt: dto.expiresAt,
    current: dto.current,
  };
}
