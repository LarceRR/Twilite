import type { PixelObjectMobileDto } from './pixelObjects';

/** Open registry — the backend accepts any string, the client falls back for unknown kinds. */
export type SurfaceObjectKindDto = 'Fire' | 'Cloud' | (string & {});

export type SurfaceObjectStateDto = 'Emerging' | 'Active' | 'Fading' | 'Settled';

export type SurfaceObjectMetadataDto = Readonly<Record<string, unknown>>;

export type SurfaceObjectDto = {
  readonly id: string;
  readonly spaceId: string;
  readonly surfaceId: string;
  readonly cellX: number;
  readonly cellY: number;
  readonly kind: SurfaceObjectKindDto;
  readonly state: SurfaceObjectStateDto;
  readonly createdByUserId: string;
  readonly subjectUserId: string;
  readonly metadata: SurfaceObjectMetadataDto;
  /** First-class binding (ADR-004); optional during dual-read window. */
  readonly pixelObjectId?: string | null;
  /** Embedded mobile DTO from snapshot/realtime (P2-S7 / P4-S2). */
  readonly pixelObject?: PixelObjectMobileDto | null;
  readonly favorite: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
};

/** The cell is assigned by the server spawn policy, never by the client. */
export type CreateSurfaceObjectRequestDto = {
  readonly spaceId: string;
  readonly kind: SurfaceObjectKindDto;
  readonly subjectUserId: string;
  readonly metadata?: SurfaceObjectMetadataDto;
  readonly pixelObjectId?: string;
};

export type ChangeSurfaceObjectStateRequestDto = {
  readonly id: string;
  readonly version: number;
};

export type UpdateSurfaceObjectRequestDto = {
  readonly id: string;
  readonly version: number;
  readonly favorite?: boolean;
  readonly metadata?: SurfaceObjectMetadataDto;
};

export type DeleteSurfaceObjectRequestDto = {
  readonly id: string;
  readonly version: number;
};
