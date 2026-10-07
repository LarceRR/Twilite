import type { MomentCatalogPage, MomentPack } from '../domain/entities/MomentCatalog';

/** Pages can overlap on a cursor boundary. Keep the first copy. */
export function mergeMomentCatalogPages(
  pages: readonly MomentCatalogPage[],
): readonly MomentPack[] {
  const seen = new Set<string>();
  const packs: MomentPack[] = [];
  for (const page of pages) {
    for (const pack of page.packs) {
      if (seen.has(pack.id)) continue;
      seen.add(pack.id);
      packs.push(pack);
    }
  }
  return packs;
}
