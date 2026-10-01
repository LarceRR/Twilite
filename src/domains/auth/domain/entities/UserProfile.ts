import type { Email } from '../value-objects/Email';
import type { UserId } from '../value-objects/UserId';

export type UserProfileGroup = {
  readonly id: string;
  readonly name: string;
};

export type UserProfile = {
  readonly id: UserId;
  readonly email: Email | null;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly groups: readonly UserProfileGroup[];
  readonly permissions: readonly string[];
};
