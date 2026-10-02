import { useFrame } from '@react-three/fiber/native';
import { memo, type ReactElement, useEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  MeshBasicMaterial,
  type PerspectiveCamera,
} from 'three';

import { isPerspectiveCamera } from './FieldCameraRig';
import { useFieldCameraStore } from './fieldCameraStore';
import {
  buildViewportHighlightIndices,
  buildViewportHighlightPositions,
  listViewportCells,
  VIEWPORT_CELL_HIGHLIGHT,
  VIEWPORT_CELL_HIGHLIGHT_OPACITY,
  type ViewportCell,
  viewportHighlightCapacity,
} from './viewportCells';

type ViewportCellHighlightProps = {
  readonly rowCount: number;
  readonly baseCompression: number;
  readonly endCompression: number;
};

type HighlightSignature = {
  current: string;
};

function ViewportCellHighlightComponent({
  rowCount,
  baseCompression,
  endCompression,
}: ViewportCellHighlightProps): ReactElement {
  const mesh = useMemo(createHighlightMesh, []);
  const signature = useRef('');

  useFrame((state) => {
    syncHighlightMesh(mesh, signature, { rowCount, baseCompression, endCompression }, state);
  }, 1);

  useEffect(() => {
    return () => disposeHighlightMesh(mesh);
  }, [mesh]);

  return <primitive object={mesh} />;
}

export const ViewportCellHighlight = memo(ViewportCellHighlightComponent);

function createHighlightMesh(): Mesh {
  const geometry = new BufferGeometry();
  geometry.setDrawRange(0, 0);
  const material = new MeshBasicMaterial({
    color: VIEWPORT_CELL_HIGHLIGHT,
    transparent: true,
    opacity: VIEWPORT_CELL_HIGHLIGHT_OPACITY,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  return mesh;
}

function disposeHighlightMesh(mesh: Mesh): void {
  mesh.geometry.dispose();
  const material = mesh.material;
  if (Array.isArray(material)) {
    for (const entry of material) entry.dispose();
    return;
  }
  material.dispose();
}

function syncHighlightMesh(
  mesh: Mesh,
  signature: HighlightSignature,
  props: ViewportCellHighlightProps,
  state: {
    readonly camera: unknown;
    readonly size: { readonly width: number; readonly height: number };
  },
): void {
  const width = Math.round(state.size.width);
  const height = Math.round(state.size.height);
  if (width < 1 || height < 1 || !isPerspectiveCamera(state.camera)) return;
  const next = highlightSignature(width, height, props);
  if (next === signature.current) return;
  signature.current = next;
  paintViewportHighlight(mesh, state.camera, props);
}

function highlightSignature(
  width: number,
  height: number,
  props: ViewportCellHighlightProps,
): string {
  const revision = useFieldCameraStore.getState().revision;
  return `${revision}|${width}x${height}|${props.baseCompression}|${props.endCompression}|${props.rowCount}`;
}

function paintViewportHighlight(
  mesh: Mesh,
  camera: PerspectiveCamera,
  props: ViewportCellHighlightProps,
): void {
  camera.updateMatrixWorld();
  const cells = listViewportCells(
    props.rowCount,
    props.baseCompression,
    props.endCompression,
    camera,
  );
  const geometry = mesh.geometry;
  ensureHighlightCapacity(geometry, props.rowCount);
  if (cells.length === 0) {
    geometry.setDrawRange(0, 0);
    return;
  }
  writeHighlightBuffers(geometry, cells, props);
  geometry.setDrawRange(0, cells.length * 6);
}

function ensureHighlightCapacity(geometry: BufferGeometry, rowCount: number): void {
  const cells = viewportHighlightCapacity(rowCount);
  const position = geometry.getAttribute('position');
  if (position && position.count >= cells * 4) return;
  const previousIndex = geometry.getIndex();
  geometry.setAttribute('position', dynamicAttribute(new Float32Array(cells * 12), 3));
  geometry.setIndex(dynamicAttribute(new Uint16Array(cells * 6), 1));
  position?.dispose();
  previousIndex?.dispose();
}

function writeHighlightBuffers(
  geometry: BufferGeometry,
  cells: readonly ViewportCell[],
  props: ViewportCellHighlightProps,
): void {
  const positions = buildViewportHighlightPositions(
    cells,
    props.baseCompression,
    props.endCompression,
    props.rowCount,
  );
  const indices = buildViewportHighlightIndices(cells.length);
  copyFloats(geometry.getAttribute('position'), positions);
  copyIndices(geometry.getIndex(), indices);
}

function dynamicAttribute(array: Float32Array | Uint16Array, itemSize: number): BufferAttribute {
  const attribute = new BufferAttribute(array, itemSize);
  attribute.setUsage(DynamicDrawUsage);
  return attribute;
}

function copyFloats(attribute: unknown, source: Float32Array): void {
  if (!(attribute instanceof BufferAttribute)) return;
  const target = attribute.array;
  if (!(target instanceof Float32Array) || target.length < source.length) return;
  target.set(source);
  attribute.needsUpdate = true;
}

function copyIndices(attribute: unknown, source: Uint16Array): void {
  if (!(attribute instanceof BufferAttribute)) return;
  const target = attribute.array;
  if (!(target instanceof Uint16Array) || target.length < source.length) return;
  target.set(source);
  attribute.needsUpdate = true;
}
