import type { AuthSession } from '../entities/AuthSession';
import type { DeviceSession } from '../entities/DeviceSession';
import type { QrLoginPreview } from '../entities/QrLoginPreview';
import type { UserProfile } from '../entities/UserProfile';
import type { Email } from '../value-objects/Email';

export type OAuthProvider = 'apple' | 'google';

export type SignInCredentials =
  | { readonly type: 'email'; readonly email: Email; readonly password: string }
  | { readonly type: 'oauth'; readonly provider: OAuthProvider; readonly idToken: string };

export type SignUpCredentials = {
  readonly email: Email;
  readonly password: string;
  readonly displayName: string;
};

export type AvatarContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export type AvatarUploadTicket = {
  readonly assetId: string;
  readonly uploadUrl: string;
  readonly storageKey: string;
  readonly expiresAt: string;
  readonly headers: {
    readonly 'Content-Type': string;
    readonly 'Cache-Control': string;
  };
};

export type UpdateProfilePatch = {
  readonly displayName?: string;
  readonly avatarUrl?: string | null;
};

export type AuthRepository = {
  signIn(credentials: SignInCredentials): Promise<AuthSession>;
  signUp(credentials: SignUpCredentials): Promise<AuthSession>;
  refresh(refreshToken: string): Promise<AuthSession>;
  signOut(session: AuthSession): Promise<void>;
  profile(session: AuthSession): Promise<UserProfile>;
  updateProfile(patch: UpdateProfilePatch): Promise<UserProfile>;
  createAvatarUpload(input: {
    readonly contentType: AvatarContentType;
    readonly byteSize: number;
  }): Promise<AvatarUploadTicket>;
  confirmAvatar(assetId: string): Promise<UserProfile>;
  inspectQrLogin(token: string): Promise<QrLoginPreview>;
  approveQrLogin(token: string): Promise<void>;
  denyQrLogin(token: string): Promise<void>;
  listSessions(): Promise<readonly DeviceSession[]>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllSessions(): Promise<void>;
};

/** Secure Store port: the only place raw tokens are persisted. */
export type SessionStorage = {
  read(): Promise<AuthSession | null>;
  write(session: AuthSession): Promise<void>;
  clear(): Promise<void>;
};
