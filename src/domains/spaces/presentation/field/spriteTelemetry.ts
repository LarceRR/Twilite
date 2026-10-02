export type SpriteTelemetryEvent =
  | {
      readonly name: 'sprite.texture_failed';
      readonly code: string;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly name: 'sprite.texture_loaded';
      readonly ms: number;
      readonly bytes: number;
    }
  | {
      readonly name: 'sprite.cache_evicted';
      readonly count: number;
    }
  | {
      readonly name: 'sprite.gl_paint';
      readonly ms: number;
      readonly visibleCount: number;
    };

type Listener = (event: SpriteTelemetryEvent) => void;

const listeners = new Set<Listener>();

/** Redacted sprite/GL telemetry (P4-S12). Never include URLs or tokens. */
export function emitSpriteTelemetry(event: SpriteTelemetryEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeSpriteTelemetry(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
