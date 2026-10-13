import type {
  PixelObjectMobileDto,
  SurfaceObjectKindDto,
  SurfaceObjectStateDto,
} from '@/shared/contracts';

import type { SpaceId } from '../value-objects/SpaceId';

export type SurfaceObject = {
  readonly id: string;
  readonly spaceId: SpaceId;
  readonly surfaceId: string;
  readonly cell: { readonly x: number; readonly y: number };
  readonly kind: SurfaceObjectKindDto;
  readonly state: SurfaceObjectStateDto;
  readonly pixelObjectId: string | null;
  readonly pixelObject: PixelObjectMobileDto | null;
  readonly createdAt: Date;
  readonly version: number;
};
