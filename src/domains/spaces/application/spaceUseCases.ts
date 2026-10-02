import { type CurrentUser, requireUserId } from '@/domains/auth/application/CurrentUser';
import type { Email } from '@/domains/auth/domain/value-objects/Email';
import type { UseCase } from '@/shared/application/UseCase';
import { NetworkError } from '@/shared/errors';

import type { Invitation } from '../domain/entities/Invitation';
import type { Space, SpaceType } from '../domain/entities/Space';
import type { SpaceRepository } from '../domain/repositories/SpaceRepository';
import { assertPermission } from '../domain/services/permissionService';
import type { SpaceId } from '../domain/value-objects/SpaceId';
import { defaultPermissionsForRole } from '../domain/value-objects/SpacePermission';

export type SpaceUseCaseDeps = {
  readonly spaces: SpaceRepository;
  readonly currentUser: CurrentUser;
};

export function listSpacesUseCase(deps: SpaceUseCaseDeps): UseCase<void, readonly Space[]> {
  return async () => deps.spaces.list();
}

export type CreateSpaceCommand = {
  readonly type: SpaceType;
  readonly title: string;
};

export function createSpaceUseCase(deps: SpaceUseCaseDeps): UseCase<CreateSpaceCommand, Space> {
  return async (command) => {
    requireUserId(deps.currentUser);

    return deps.spaces.create(command);
  };
}

export type InviteMemberCommand = {
  readonly spaceId: SpaceId;
  readonly email: Email;
};

export function inviteMemberUseCase(
  deps: SpaceUseCaseDeps,
): UseCase<InviteMemberCommand, Invitation> {
  return async (command) => {
    const currentUserId = requireUserId(deps.currentUser);
    const space = await deps.spaces.byId(command.spaceId);

    // Previously an unknown space silently skipped the permission check and
    // still sent the invite.
    if (space === null) {
      throw new NetworkError('Пространство не найдено', 404, {
        context: { spaceId: command.spaceId },
      });
    }

    assertPermission(space, currentUserId, 'space.invite');

    return deps.spaces.invite({
      spaceId: command.spaceId,
      email: command.email,
      permissions: defaultPermissionsForRole('Member'),
    });
  };
}

export type RespondToInvitationCommand = {
  readonly invitationId: string;
  readonly accept: boolean;
};

export function respondToInvitationUseCase(
  deps: SpaceUseCaseDeps,
): UseCase<RespondToInvitationCommand, Invitation> {
  return async (command) => {
    requireUserId(deps.currentUser);

    return deps.spaces.respondToInvitation(command.invitationId, command.accept);
  };
}
