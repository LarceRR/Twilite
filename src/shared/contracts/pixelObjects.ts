import { PIXEL_OBJECT_FORMAT } from './limits';

export { PIXEL_OBJECT_FORMAT };

export type PixelObjectStatusDto = 'pending' | 'published' | 'rejected' | 'archived';

export type PixelObjectManifestDto = {
  readonly format: typeof PIXEL_OBJECT_FORMAT;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly sheet: {
    readonly mediaId: string;
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly columns: number;
    readonly rows: number;
    readonly frameCount: number;
  };
  readonly animations: readonly [
    {
      readonly id: 'default';
      readonly loop: true;
      readonly frames: readonly { readonly frame: number; readonly durationMs: number }[];
    },
  ];
  readonly staticPreviewFrame: number;
};

export type PixelObjectDto = {
  readonly id: string;
  readonly title: string;
  readonly authorDisplayName: string;
  readonly authorUserId: string;
  readonly status: PixelObjectStatusDto;
  readonly rejectionComment: string | null;
  readonly revision: number;
  readonly manifest: PixelObjectManifestDto;
  readonly sheetUrl: string;
  readonly previewUrl?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
};

export type PixelObjectListDto = {
  readonly items: readonly PixelObjectDto[];
  readonly nextCursor?: string | null;
};

/**
 * Mobile runtime DTO. Never exposes mediaId.
 * `revision` / `previewUrl` optional during compatibility window.
 */
export type PixelObjectMobileDto = {
  readonly id: string;
  readonly title: string;
  readonly revision?: number;
  readonly format: typeof PIXEL_OBJECT_FORMAT;
  readonly sheetUrl: string;
  readonly previewUrl?: string | null;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly sheet: {
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly columns: number;
    readonly rows: number;
    readonly frameCount: number;
  };
  readonly animations: PixelObjectManifestDto['animations'];
  readonly staticPreviewFrame: number;
};
