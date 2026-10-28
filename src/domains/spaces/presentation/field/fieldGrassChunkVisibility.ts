/** Grass may render only after the matching chunk surface is GPU-ready. */
export function isFieldGrassChunkVisible(
  chunkIndex: number | null,
  gpuReadyChunkIndices: readonly number[],
): boolean {
  return chunkIndex !== null && gpuReadyChunkIndices.includes(chunkIndex);
}
