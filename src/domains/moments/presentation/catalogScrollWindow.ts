export type CatalogBand = {
  readonly y: number;
  readonly height: number;
};

export type ScrollMetrics = {
  readonly offset: number;
  readonly viewport: number;
  readonly contentHeight: number;
};

export const PACK_ENTER_OVERSCAN = 120;
export const PACK_HOLD_OVERSCAN = 420;

export function sameIds(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
}

/** Enter near the viewport. Once playing, stay mounted until well outside it. */
export function nextActiveIds(
  previous: ReadonlySet<string>,
  bands: ReadonlyMap<string, CatalogBand>,
  offset: number,
  viewport: number,
  origin: number,
): ReadonlySet<string> {
  const next = new Set<string>();
  for (const [id, band] of bands) {
    const placed = { y: origin + band.y, height: band.height };
    const entered = isBandVisible(placed, offset, viewport, PACK_ENTER_OVERSCAN);
    const held = previous.has(id) && isBandVisible(placed, offset, viewport, PACK_HOLD_OVERSCAN);
    if (entered || held) next.add(id);
  }
  return next;
}

export function isBandVisible(
  band: CatalogBand,
  offset: number,
  viewport: number,
  overscan: number,
): boolean {
  if (viewport <= 0 || band.height <= 0) return false;
  const top = band.y - overscan;
  const bottom = band.y + band.height + overscan;
  return bottom > offset && top < offset + viewport;
}

export function shouldLoadMore(metrics: ScrollMetrics, threshold: number): boolean {
  if (metrics.contentHeight <= 0 || metrics.viewport <= 0) return false;
  return metrics.offset + metrics.viewport >= metrics.contentHeight - threshold;
}

export function readScrollMetrics(native: {
  readonly contentOffset: { readonly y: number };
  readonly layoutMeasurement: { readonly height: number };
  readonly contentSize: { readonly height: number };
}): ScrollMetrics {
  return {
    offset: Math.max(0, native.contentOffset.y),
    viewport: Math.max(0, native.layoutMeasurement.height),
    contentHeight: Math.max(0, native.contentSize.height),
  };
}
