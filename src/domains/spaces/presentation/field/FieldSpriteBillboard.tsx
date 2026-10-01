import { useFrame } from '@react-three/fiber/native';
import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { DoubleSide, type Mesh, type MeshBasicMaterial, type Texture } from 'three';

import type { PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';
import { nextLoopIndex, sheetTextureOffset } from '@/shared/pixelObject/sheetFrame';

import { bridgeCellToWorld, FIELD_CELL_SIZE } from './fieldLayout';
import { cloneSheetTexture, loadRemoteTexture } from './loadRemoteTexture';
import { shouldAnimateFieldSprite } from './shouldAnimateFieldSprite';

/** Max sprite footprint on a cell (world units) — ~half a tile. */
const FIELD_SPRITE_MAX_WORLD = FIELD_CELL_SIZE * 0.55;

type FieldSpriteBillboardProps = {
  readonly surfaceObjectId: string;
  readonly cell: { readonly x: number; readonly y: number };
  readonly dto: PixelObjectMobileDto;
};

function spriteWorldSize(dto: PixelObjectMobileDto): { readonly w: number; readonly h: number } {
  const fw = Math.max(1, dto.sheet.frameWidth);
  const fh = Math.max(1, dto.sheet.frameHeight);
  const scale = Math.min(FIELD_SPRITE_MAX_WORLD / fw, FIELD_SPRITE_MAX_WORLD / fh);
  return { w: fw * scale, h: fh * scale };
}

/**
 * One animated spritesheet billboard inside the shared field WebGL context.
 * Texture image is shared; UV offset is per-instance via a cloned Texture.
 */
export function FieldSpriteBillboard({
  cell,
  dto,
}: FieldSpriteBillboardProps): ReactElement | null {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const textureRef = useRef<Texture | null>(null);
  const indexRef = useRef(0);
  const deadlineRef = useRef(0);
  const [texture, setTexture] = useState<Texture | null>(null);

  const world = useMemo(() => bridgeCellToWorld(cell), [cell.x, cell.y]);
  const size = useMemo(() => spriteWorldSize(dto), [dto]);
  const columns = Math.max(1, dto.sheet.columns);
  const rows = Math.max(1, dto.sheet.rows);
  const clip = dto.animations[0]?.frames ?? [];
  const sheetUrl = dto.sheetUrl;
  const previewFrame = dto.staticPreviewFrame;

  useEffect(() => {
    let cancelled = false;
    let owned: Texture | null = null;

    void loadRemoteTexture(sheetUrl)
      .then((base) => {
        if (cancelled) {
          return;
        }
        owned = cloneSheetTexture(base);
        owned.repeat.set(1 / columns, 1 / rows);
        const frame = clip[0]?.frame ?? previewFrame;
        const offset = sheetTextureOffset(frame, columns, rows);
        owned.offset.set(offset.x, offset.y);
        textureRef.current = owned;
        indexRef.current = 0;
        deadlineRef.current = performance.now() + (clip[0]?.durationMs ?? 100);
        setTexture(owned);
      })
      .catch(() => {
        if (!cancelled) {
          setTexture(null);
        }
      });

    return () => {
      cancelled = true;
      // Do not dispose shared image on the cached base — only drop this clone's GL handle.
      owned?.dispose();
      textureRef.current = null;
      setTexture(null);
    };
    // clip identity changes every render if empty (`?? []`); key off sheet + dims instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable deps
  }, [sheetUrl, columns, rows, previewFrame]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (mesh != null) {
      mesh.lookAt(camera.position.x, mesh.position.y, camera.position.z);
    }

    const tex = textureRef.current;
    if (tex == null || clip.length < 2 || !shouldAnimateFieldSprite(cell.y)) {
      return;
    }

    const now = performance.now();
    let advanced = false;
    while (now >= deadlineRef.current) {
      indexRef.current = nextLoopIndex(indexRef.current, clip.length);
      const duration = clip[indexRef.current]?.durationMs ?? 100;
      deadlineRef.current += duration;
      advanced = true;
      if (deadlineRef.current < now - duration) {
        deadlineRef.current = now + duration;
      }
    }
    if (!advanced) {
      return;
    }
    const frame = clip[indexRef.current]?.frame ?? previewFrame;
    const offset = sheetTextureOffset(frame, columns, rows);
    tex.offset.set(offset.x, offset.y);
  });

  if (texture == null) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={[world.x, size.h * 0.5, world.z]}
      renderOrder={10_000 - cell.y}
      frustumCulled={false}
    >
      <planeGeometry args={[size.w, size.h]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
