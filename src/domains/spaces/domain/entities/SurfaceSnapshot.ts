import type { SpaceId } from '../value-objects/SpaceId';
import type { SurfaceObject } from './SurfaceObject';

export type SurfaceBounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
};

export type SurfaceSnapshot = {
  readonly id: string;
  readonly spaceId: SpaceId;
  readonly bounds: SurfaceBounds | null;
  readonly version: number;
  readonly objects: readonly SurfaceObject[];
};
