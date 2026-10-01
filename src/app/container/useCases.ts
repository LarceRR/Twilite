import type { AuthSession } from '@/domains/auth/domain/entities/AuthSession';
import type { DeviceSession } from '@/domains/auth/domain/entities/DeviceSession';
import type { QrLoginPreview } from '@/domains/auth/domain/entities/QrLoginPreview';
import type {
  SignInCredentials,
  SignUpCredentials,
} from '@/domains/auth/domain/repositories/AuthRepository';
import type { RevokeAllDeviceSessionsResult } from '@/domains/auth/application/authUseCases';
import type {
  CreateSpaceCommand,
  InviteMemberCommand,
  RespondToInvitationCommand,
} from '@/domains/spaces/application/spaceUseCases';
import type { Invitation } from '@/domains/spaces/domain/entities/Invitation';
import type { Space } from '@/domains/spaces/domain/entities/Space';
import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import type { ChangeSurfaceObjectStateCommand } from '@/domains/surface-objects/application/changeSurfaceObjectState';
import type { CreateSurfaceObjectCommand } from '@/domains/surface-objects/application/createSurfaceObject';
import type {
  DeleteSurfaceObjectCommand,
  ToggleFavoriteCommand,
} from '@/domains/surface-objects/application/toggleFavorite';
import type { SurfaceObject } from '@/domains/surface-objects/domain/entities/SurfaceObject';
import type { SurfaceSnapshot } from '@/domains/surfaces/domain/repositories/SurfaceRepository';
import type { GetTimelineQuery } from '@/domains/timeline/application/getTimeline';
import type { TimelinePage } from '@/domains/timeline/domain/entities/TimelineEvent';
import type { AppThemePack } from '@/design-system/themes';
import type { PixelObjectDto, PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';
import type { Query, UseCase } from '@/shared/application/UseCase';

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

  readonly getSurfaceSnapshot: Query<SpaceId, SurfaceSnapshot>;

  readonly createSurfaceObject: UseCase<CreateSurfaceObjectCommand, SurfaceObject>;
  readonly activateSurfaceObject: UseCase<ChangeSurfaceObjectStateCommand, SurfaceObject>;
  readonly softenSurfaceObject: UseCase<ChangeSurfaceObjectStateCommand, SurfaceObject>;
  readonly ageSurfaceObject: UseCase<ChangeSurfaceObjectStateCommand, SurfaceObject>;
  readonly toggleFavorite: UseCase<ToggleFavoriteCommand, SurfaceObject>;
  readonly deleteSurfaceObject: UseCase<DeleteSurfaceObjectCommand, void>;

  readonly getTimeline: Query<GetTimelineQuery, TimelinePage>;

  readonly listPublishedThemes: UseCase<void, readonly AppThemePack[]>;
  readonly getThemeDetail: UseCase<string, AppThemePack>;
  readonly applyTheme: UseCase<AppThemePack, void>;
  readonly hydrateAppliedTheme: UseCase<void, void>;

  readonly listPublishedPixelObjects: UseCase<void, readonly PixelObjectDto[]>;
  readonly getPixelObjectMobile: UseCase<string, PixelObjectMobileDto>;
};
