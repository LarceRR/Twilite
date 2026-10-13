import { useFrame } from '@react-three/fiber/native';
import type { ReactElement, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Group, Mesh, Texture } from 'three';

import type { AuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import type { SurfaceObject } from '@/domains/spaces/domain/entities/SurfaceObject';
import { FieldSurfaceObjectArtwork } from './FieldSurfaceObjectArtwork';
import { cellCenterOnPlane } from './fieldGridCells';
import type { FieldGridConfig } from './fieldGridConfig';
import { useFieldConfig } from './useFieldConfig';
import {
  advanceSpritePlayback,
  easeOutCubic,
  type SpritePlaybackCursor,
} from './surfaceObjectAnimation';

const RISE_DURATION_MS = 760;
const PLATFORM_HEIGHT_RATIO = 0.12;
const ART_HEIGHT_RATIO = 0.62;

type RuntimeObject = {
  readonly column: RefObject<Mesh | null>;
  readonly artwork: RefObject<Group | null>;
  readonly object: SurfaceObject;
  readonly animate: boolean;
  readonly platformHeight: number;
  readonly artHeight: number;
  texture: Texture | null;
  cursor: SpritePlaybackCursor;
  elapsedMs: number;
  frame: number | null;
};

export function FieldSurfaceObjects({
  objects,
  config,
  headers,
}: {
  readonly objects: readonly SurfaceObject[];
  readonly config: FieldGridConfig;
  readonly headers: AuthenticatedAssetHeaders;
}): ReactElement {
  const runtime = useRef(new Map<string, RuntimeObject>());
  const appearing = useAppearingObjects(objects);
  const platformColor = useFieldPlatformColor();

  const register = useCallback((item: RuntimeObject): (() => void) => {
    runtime.current.set(item.object.id, item);
    return () => {
      runtime.current.delete(item.object.id);
    };
  }, []);

  useFrame((_, delta) => {
    for (const item of runtime.current.values()) {
      advanceColumn(item, delta * 1000);
      advanceArtwork(item, delta * 1000);
    }
  });

  return (
    <group>
      {objects.map((object) => (
        <FieldSurfaceObjectColumn
          animate={appearing.has(object.id)}
          config={config}
          headers={headers}
          platformColor={platformColor}
          key={object.id}
          object={object}
          register={register}
        />
      ))}
    </group>
  );
}

function useFieldPlatformColor(): string {
  return useFieldConfig().activeCells.fillHex;
}

function FieldSurfaceObjectColumn({
  object,
  config,
  headers,
  animate,
  platformColor,
  register,
}: {
  readonly object: SurfaceObject;
  readonly config: FieldGridConfig;
  readonly headers: AuthenticatedAssetHeaders;
  readonly animate: boolean;
  readonly platformColor: string;
  readonly register: (item: RuntimeObject) => () => void;
}): ReactElement {
  const column = useRef<Mesh>(null);
  const artwork = useRef<Group>(null);
  const platformHeight = config.cellSize * PLATFORM_HEIGHT_RATIO;
  const artHeight = config.cellSize * ART_HEIGHT_RATIO;
  const center = cellCenterOnPlane(object.cell.x, object.cell.y, config);
  const item = useMemo<RuntimeObject>(
    () => ({
      column,
      artwork,
      object,
      animate,
      platformHeight,
      artHeight,
      texture: null,
      cursor: { index: 0, elapsedMs: 0 },
      elapsedMs: animate ? 0 : RISE_DURATION_MS,
      frame: null,
    }),
    [animate, artHeight, object, platformHeight],
  );

  useEffect(() => register(item), [item, register]);

  const onTextureReady = useCallback(
    (texture: Texture | null): void => {
      item.texture = texture;
      item.frame = null;
    },
    [item],
  );

  return (
    <group position={[center[0], center[1], 0]}>
      <mesh ref={column}>
        <boxGeometry args={[config.cellSize, config.cellSize, platformHeight]} />
        <meshStandardMaterial color={platformColor} roughness={0.82} />
      </mesh>
      <group ref={artwork} rotation={[0, 0, 0]}>
        <FieldSurfaceObjectArtwork
          height={artHeight}
          headers={headers}
          onTextureReady={onTextureReady}
          sprite={object.pixelObject}
        />
      </group>
    </group>
  );
}

function advanceColumn(item: RuntimeObject, deltaMs: number): void {
  item.elapsedMs = Math.min(RISE_DURATION_MS, item.elapsedMs + deltaMs);
  const progress = easeOutCubic(item.elapsedMs / RISE_DURATION_MS);
  const height = item.platformHeight * progress;
  if (item.column.current !== null) {
    // Scale only the explicit platform depth, keeping its bottom on the deck.
    item.column.current.scale.z = progress;
    item.column.current.position.z = height / 2;
  }
  if (item.artwork.current !== null) {
    item.artwork.current.position.z = height + item.artHeight / 2;
  }
}

function advanceArtwork(item: RuntimeObject, deltaMs: number): void {
  const sprite = item.object.pixelObject;
  const texture = item.texture;
  if (sprite === null || texture === null) return;
  const frames = sprite.animations[0]?.frames ?? [];
  const advanced = advanceSpritePlayback(item.cursor, frames, deltaMs);
  item.cursor = advanced.cursor;
  if (advanced.frame === null || advanced.frame === item.frame) return;
  item.frame = advanced.frame;
  setTextureFrame(texture, advanced.frame, sprite.sheet.columns, sprite.sheet.rows);
}

function setTextureFrame(texture: Texture, frame: number, columns: number, rows: number): void {
  const column = frame % columns;
  const row = Math.floor(frame / columns);
  texture.repeat.set(1 / columns, 1 / rows);
  texture.offset.set(column / columns, 1 - (row + 1) / rows);
  texture.updateMatrix();
}

function useAppearingObjects(objects: readonly SurfaceObject[]): ReadonlySet<string> {
  const known = useRef(new Set<string>());
  const initialized = useRef(false);
  const [appearing, setAppearing] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const newIds = collectNewObjectIds(objects, known.current, initialized.current);
    for (const object of objects) known.current.add(object.id);
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    initialized.current = true;
    if (newIds.length > 0) {
      setAppearing((current) => new Set([...current, ...newIds]));
    }
  }, [objects]);

  useEffect(() => {
    if (appearing.size === 0) return;
    const timer = setTimeout(() => setAppearing(new Set()), RISE_DURATION_MS + 100);
    return () => clearTimeout(timer);
  }, [appearing]);

  return appearing;
}

function collectNewObjectIds(
  objects: readonly SurfaceObject[],
  known: ReadonlySet<string>,
  initialized: boolean,
): readonly string[] {
  if (!initialized) return [];
  return objects.filter((object) => !known.has(object.id)).map((object) => object.id);
}
