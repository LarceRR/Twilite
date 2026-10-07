import type { AppThemePack } from '@/design-system/themes';
import type { RevokeAllDeviceSessionsResult } from '@/domains/auth/application/authUseCases';
import type { AuthSession } from '@/domains/auth/domain/entities/AuthSession';
import type { DeviceSession } from '@/domains/auth/domain/entities/DeviceSession';
import type { QrLoginPreview } from '@/domains/auth/domain/entities/QrLoginPreview';
import type {
  SignInCredentials,
  SignUpCredentials,
} from '@/domains/auth/domain/repositories/AuthRepository';
import type {
  MomentCatalogPage,
  MomentCatalogQuery,
} from '@/domains/moments/domain/entities/MomentCatalog';
import type {
  CreateSpaceCommand,
  InviteMemberCommand,
  RespondToInvitationCommand,
} from '@/domains/spaces/application/spaceUseCases';
import type { Invitation } from '@/domains/spaces/domain/entities/Invitation';
import type { Space } from '@/domains/spaces/domain/entities/Space';
import type { UseCase } from '@/shared/application/UseCase';

export type UseCases = {
  readonly signIn: UseCase<SignInCredentials, AuthSession>;
  readonly signUp: UseCase<SignUpCredentials, AuthSession>;
  readonly signOut: UseCase<void, void>;
  readonly restoreSession: UseCase<void, AuthSession | null>;
  readonly inspectQrLogin: UseCase<string, QrLoginPreview>;
  readonly approveQrLogin: UseCase<string, void>;
  readonly denyQrLogin: UseCase<string, void>;
  readonly listDeviceSessions: UseCase<void, readonly DeviceSession[]>;
  readonly revokeDeviceSession: UseCase<
    { readonly sessionId: string; readonly clearLocal: boolean },
    void
  >;
  readonly revokeAllDeviceSessions: UseCase<void, RevokeAllDeviceSessionsResult>;

  readonly listSpaces: UseCase<void, readonly Space[]>;
  readonly createSpace: UseCase<CreateSpaceCommand, Space>;
  readonly inviteMember: UseCase<InviteMemberCommand, Invitation>;
  readonly respondToInvitation: UseCase<RespondToInvitationCommand, Invitation>;

  readonly listPublishedThemes: UseCase<void, readonly AppThemePack[]>;
  readonly getThemeDetail: UseCase<string, AppThemePack>;
  readonly applyTheme: UseCase<AppThemePack, void>;
  readonly hydrateAppliedTheme: UseCase<void, void>;

  readonly listMomentCatalogPage: UseCase<MomentCatalogQuery, MomentCatalogPage>;
};
