export type TextureCacheKey = {
  readonly url: string;
  readonly revision: number | null;
};

export function textureCacheKeyString(key: TextureCacheKey): string {
  return `${key.url}#r=${key.revision ?? 0}`;
}

export type TextureBudgetEvent =
  | { readonly type: 'evict'; readonly key: string; readonly bytes: number }
  | {
      readonly type: 'fail';
      readonly code: string;
      readonly width: number;
      readonly height: number;
    }
  | { readonly type: 'load'; readonly ms: number; readonly bytes: number };

/** LRU texture budget tracker (pure; GL handles live in the layer) — P4-S4. */
export class SpriteTextureBudget {
  private readonly order: string[] = [];
  private readonly sizes = new Map<string, number>();
  private totalBytes = 0;

  constructor(
    private readonly maxBytes: number,
    private readonly onEvent?: (event: TextureBudgetEvent) => void,
  ) {}

  get usedBytes(): number {
    return this.totalBytes;
  }

  estimateBytes(width: number, height: number): number {
    return Math.max(1, width) * Math.max(1, height) * 4;
  }

  touch(key: string, bytes: number): string[] {
    this.remove(key);
    this.order.push(key);
    this.sizes.set(key, bytes);
    this.totalBytes += bytes;
    return this.evictIfNeeded();
  }

  remove(key: string): void {
    const bytes = this.sizes.get(key);
    if (bytes === undefined) return;
    this.sizes.delete(key);
    this.totalBytes -= bytes;
    const index = this.order.indexOf(key);
    if (index >= 0) this.order.splice(index, 1);
  }

  private evictIfNeeded(): string[] {
    const evicted: string[] = [];
    while (this.totalBytes > this.maxBytes && this.order.length > 0) {
      const key = this.order.shift();
      if (key === undefined) break;
      const bytes = this.sizes.get(key) ?? 0;
      this.sizes.delete(key);
      this.totalBytes -= bytes;
      evicted.push(key);
      this.onEvent?.({ type: 'evict', key, bytes });
    }
    return evicted;
  }
}

export const SPRITE_TEXTURE_CONCURRENCY = 3;
export const SPRITE_TEXTURE_RETRIES = 3;
export const SPRITE_TEXTURE_BUDGET_BYTES = 32 * 1024 * 1024;
