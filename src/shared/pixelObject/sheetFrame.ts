export function sheetFrameOrigin(
  frame: number,
  columns: number,
  frameWidth: number,
  frameHeight: number,
): { readonly sx: number; readonly sy: number } {
  const safeColumns = Math.max(1, columns);
  const column = ((frame % safeColumns) + safeColumns) % safeColumns;
  const row = Math.floor(frame / safeColumns);
  return { sx: column * frameWidth, sy: row * frameHeight };
}

export function nextLoopIndex(index: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  return (index + 1) % count;
}

/** UV offset for a spritesheet sub-rect on a Three.js texture (Y flip for image space). */
export function sheetTextureOffset(
  frameIndex: number,
  columns: number,
  rows: number,
): { readonly x: number; readonly y: number } {
  const safeColumns = Math.max(1, columns);
  const safeRows = Math.max(1, rows);
  const column = ((frameIndex % safeColumns) + safeColumns) % safeColumns;
  const row = Math.floor(frameIndex / safeColumns);
  return {
    x: column / safeColumns,
    y: (safeRows - row - 1) / safeRows,
  };
}
