export type AuthSessionDto = {
  readonly accessToken?: string;
  readonly refreshToken?: string;
  /** ISO-8601 */
  readonly expiresAt: string;
  readonly userId: string;
};

export type DeviceInfoDto = {
  readonly platform: 'ios' | 'android' | 'web' | 'unknown';
  readonly model?: string | null;
  readonly appVersion?: string | null;
};

export type SignInRequestDto =
  | {
      readonly type: 'email';
      readonly email: string;
      readonly password: string;
      readonly device?: DeviceInfoDto;
    }
  | {
      readonly type: 'oauth';
      readonly provider: 'apple' | 'google';
      readonly idToken: string;
      readonly device?: DeviceInfoDto;
    };

export type SignUpRequestDto = {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly device?: DeviceInfoDto;
};

export type RefreshSessionRequestDto = {
  readonly refreshToken: string;
};

export type UserProfileGroupDto = {
  readonly id: string;
  readonly name: string;
};

export type UserProfileDto = {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly groups?: readonly UserProfileGroupDto[];
  readonly permissions?: readonly string[];
};

export type QrLoginTokenRequestDto = {
  readonly token: string;
};

export type QrLoginInspectResponseDto = {
  readonly challengeId: string;
  readonly expiresAt: string;
  readonly requestingDevice: {
    readonly platform: 'ios' | 'android' | 'web' | 'unknown';
    readonly model: string | null;
    readonly appVersion: string | null;
    readonly ipLabel: string;
  };
};

export type QrLoginDecisionResponseDto = {
  readonly status: 'approved' | 'denied';
};

export type SessionDto = {
  readonly id: string;
  readonly device: DeviceInfoDto;
  readonly ipLabel: string | null;
  readonly createdAt: string;
  readonly lastUsedAt: string;
  readonly expiresAt: string;
  readonly current: boolean;
};
