export type AvatarContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export type AvatarUploadTicketDto = {
  readonly assetId: string;
  readonly uploadUrl: string;
  readonly storageKey: string;
  readonly expiresAt: string;
  readonly headers: {
    readonly 'Content-Type': string;
    readonly 'Cache-Control': string;
  };
};
