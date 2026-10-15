export type FieldCpuScope = 'grid' | 'objects';

export type FieldPerformanceSnapshot = {
  readonly sampledAtMs: number;
  readonly fps: number;
  readonly frameMsAverage: number;
  readonly frameMsP95: number;
  readonly frameMsMax: number;
  readonly gridCpuMs: number;
  readonly objectsCpuMs: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
  readonly shaderPrograms: number;
  readonly pendingGpuUploads: number;
};

let latestSnapshot: FieldPerformanceSnapshot | null = null;
let latestGridCpuMs = 0;
let latestObjectsCpuMs = 0;

export function recordFieldCpuWork(scope: FieldCpuScope, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  if (scope === 'grid') latestGridCpuMs = durationMs;
  else latestObjectsCpuMs = durationMs;
}

export function publishFieldPerformanceSnapshot(
  snapshot: FieldPerformanceSnapshot,
): void {
  latestSnapshot = snapshot;
}

export function getFieldPerformanceSnapshot(): FieldPerformanceSnapshot | null {
  if (latestSnapshot === null) return null;
  return {
    ...latestSnapshot,
    gridCpuMs: latestGridCpuMs,
    objectsCpuMs: latestObjectsCpuMs,
  };
}
