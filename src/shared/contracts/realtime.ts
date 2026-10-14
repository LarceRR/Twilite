import type { SurfaceObjectDto } from './surface-object';
import type { TimelineEventDto } from './timeline';

export type RealtimeChannel = 'scene' | 'timeline' | 'notifications' | 'presence';

export type RealtimeServerMessageDto =
  | { readonly type: 'pong' }
  | { readonly type: 'subscribed'; readonly spaceId: string }
  | { readonly type: 'error'; readonly message: string }
  | {
      readonly type: 'surfaceObject.created';
      readonly spaceId: string;
      readonly object: SurfaceObjectDto;
    }
  | {
      readonly type: 'surfaceObject.updated';
      readonly spaceId: string;
      readonly object: SurfaceObjectDto;
    }
  | { readonly type: 'surfaceObject.deleted'; readonly spaceId: string; readonly objectId: string }
  | { readonly type: 'surface.cleared'; readonly spaceId: string }
  | {
      readonly type: 'timeline.appended';
      readonly spaceId: string;
      readonly event: TimelineEventDto;
    }
  | {
      readonly type: 'presence.changed';
      readonly spaceId: string;
      readonly userIds: readonly string[];
    };

export type RealtimeClientMessageDto =
  | {
      readonly type: 'subscribe';
      readonly spaceId: string;
      readonly channels: readonly RealtimeChannel[];
    }
  | { readonly type: 'unsubscribe'; readonly spaceId: string }
  | { readonly type: 'ping' };
