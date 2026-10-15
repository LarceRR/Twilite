import * as Sentry from '@sentry/react-native';
import { useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';

import {
  publishFieldPerformanceSnapshot,
  recordFieldCpuWork,
} from './fieldPerformanceDiagnostics';
import { pendingFieldChunkGpuUploads } from './fieldGridChunkBake';

const SAMPLE_CAPACITY = 120;
const REPORT_INTERVAL_SEC = 5;
const JANK_FRAME_MS = 33.4;
const JANK_REPORT_AFTER_SEC = 5;
const JANK_REPORT_COOLDOWN_SEC = 60;
const RESOURCE_BASELINE_AFTER_SEC = 15;
const RESOURCE_GROWTH_THRESHOLD = 16;
const RESOURCE_GROWTH_AFTER_SEC = 30;
const RESOURCE_REPORT_COOLDOWN_SEC = 300;

type ResourceCounts = {
  readonly geometries: number;
  readonly textures: number;
  readonly shaderPrograms: number;
};

function resourceCounts(gl: { readonly info: { readonly memory: { readonly geometries: number; readonly textures: number }; readonly programs?: readonly unknown[] | null } }): ResourceCounts {
  return {
    geometries: gl.info.memory.geometries,
    textures: gl.info.memory.textures,
    shaderPrograms: gl.info.programs?.length ?? 0,
  };
}

/**
 * Low-overhead runtime telemetry. Frame intervals and renderer resource counts
 * are proxies, not direct CPU/GPU utilization percentages; native Instruments
 * is required for those measurements.
 */
export function FieldPerformanceMonitor(): null {
  const frameSamples = useRef(new Float32Array(SAMPLE_CAPACITY));
  const sampleCount = useRef(0);
  const sampleCursor = useRef(0);
  const reportElapsedSec = useRef(0);
  const jankElapsedSec = useRef(0);
  const lastJankReportSec = useRef(-JANK_REPORT_COOLDOWN_SEC);
  const baseline = useRef<ResourceCounts | null>(null);
  const resourceGrowthElapsedSec = useRef(0);
  const lastResourceReportSec = useRef(-RESOURCE_REPORT_COOLDOWN_SEC);
  const sessionElapsedSec = useRef(0);

  useFrame(({ gl }, delta) => {
    const frameMs = Math.min(1000, Math.max(0, delta * 1000));
    const samples = frameSamples.current;
    samples[sampleCursor.current] = frameMs;
    sampleCursor.current = (sampleCursor.current + 1) % SAMPLE_CAPACITY;
    sampleCount.current = Math.min(SAMPLE_CAPACITY, sampleCount.current + 1);
    sessionElapsedSec.current += delta;
    reportElapsedSec.current += delta;

    if (frameMs >= JANK_FRAME_MS) jankElapsedSec.current += delta;
    else jankElapsedSec.current = Math.max(0, jankElapsedSec.current - delta * 0.5);

    if (reportElapsedSec.current < REPORT_INTERVAL_SEC) return;
    reportElapsedSec.current = 0;

    const count = sampleCount.current;
    const ordered: number[] = [];
    let total = 0;
    let maximum = 0;
    for (let index = 0; index < count; index += 1) {
      const value = samples[index] ?? 0;
      ordered.push(value);
      total += value;
      maximum = Math.max(maximum, value);
    }
    ordered.sort((left, right) => left - right);
    const average = count > 0 ? total / count : 0;
    const p95 = count > 0 ? ordered[Math.min(count - 1, Math.floor(count * 0.95))]! : 0;
    const resources = resourceCounts(gl);
    const snapshot = {
      sampledAtMs: Date.now(),
      fps: average > 0 ? 1000 / average : 0,
      frameMsAverage: average,
      frameMsP95: p95,
      frameMsMax: maximum,
      gridCpuMs: 0,
      objectsCpuMs: 0,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: resources.geometries,
      textures: resources.textures,
      shaderPrograms: resources.shaderPrograms,
      pendingGpuUploads: pendingFieldChunkGpuUploads(),
    };
    publishFieldPerformanceSnapshot(snapshot);

    Sentry.addBreadcrumb({
      category: 'performance.field',
      message: 'Field renderer sample',
      level: p95 >= JANK_FRAME_MS ? 'warning' : 'info',
      data: snapshot,
    });

    if (
      jankElapsedSec.current >= JANK_REPORT_AFTER_SEC &&
      sessionElapsedSec.current - lastJankReportSec.current >= JANK_REPORT_COOLDOWN_SEC
    ) {
      lastJankReportSec.current = sessionElapsedSec.current;
      Sentry.captureMessage('Twilite field sustained frame-time regression', {
        level: 'warning',
        extra: snapshot,
      });
      if (__DEV__) console.warn('[field-performance] sustained frame-time regression', snapshot);
    }

    if (sessionElapsedSec.current >= RESOURCE_BASELINE_AFTER_SEC && baseline.current === null) {
      baseline.current = resources;
    } else if (baseline.current !== null) {
      const grew =
        resources.geometries > baseline.current.geometries + RESOURCE_GROWTH_THRESHOLD ||
        resources.textures > baseline.current.textures + RESOURCE_GROWTH_THRESHOLD ||
        resources.shaderPrograms > baseline.current.shaderPrograms + RESOURCE_GROWTH_THRESHOLD;
      resourceGrowthElapsedSec.current = grew
        ? resourceGrowthElapsedSec.current + REPORT_INTERVAL_SEC
        : 0;

      if (
        resourceGrowthElapsedSec.current >= RESOURCE_GROWTH_AFTER_SEC &&
        sessionElapsedSec.current - lastResourceReportSec.current >= RESOURCE_REPORT_COOLDOWN_SEC
      ) {
        lastResourceReportSec.current = sessionElapsedSec.current;
        Sentry.captureMessage('Twilite field renderer resources keep growing', {
          level: 'warning',
          extra: { ...snapshot, baseline: baseline.current },
        });
        if (__DEV__) {
          console.warn('[field-performance] renderer resources keep growing', {
            ...snapshot,
            baseline: baseline.current,
          });
        }
      }
    }
  });

  return null;
}
