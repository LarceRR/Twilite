import { createRoundedSquarePlatformGeometry, PLATFORM_CORNER_RADIUS, PLATFORM_EDGE_BEVEL } from './fieldPlatformGeometry';

const CANVAS_SIZE = 1024;
const PADDING = 32;
const LINE_HALF_WIDTH = 1;
const LINE_GRAY = 40;

type UvPoint = { readonly u: number; readonly v: number };
type UvEdge = { readonly a: UvPoint; readonly b: UvPoint; count: number };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + bytes[i]!) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** zlib stream made of uncompressed (stored) deflate blocks: no compression library needed. */
function zlibStore(raw: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(raw.length / 65535));
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  let o = 0;
  out[o++] = 0x78;
  out[o++] = 0x01;
  for (let i = 0; i < blocks; i += 1) {
    const start = i * 65535;
    const len = Math.min(65535, raw.length - start);
    out[o++] = i === blocks - 1 ? 1 : 0;
    out[o++] = len & 0xff;
    out[o++] = len >>> 8;
    const nlen = (~len) & 0xffff;
    out[o++] = nlen & 0xff;
    out[o++] = nlen >>> 8;
    out.set(raw.subarray(start, start + len), o);
    o += len;
  }
  const sum = adler32(raw);
  out[o++] = sum >>> 24;
  out[o++] = (sum >>> 16) & 0xff;
  out[o++] = (sum >>> 8) & 0xff;
  out[o++] = sum & 0xff;
  return out;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Same UV island outlines as the live tile geometry: edges used by exactly one triangle. */
function collectUvEdges(size: number, thickness: number, cornerRadius: number, edgeBevel: number): UvEdge[] {
  const geometry = createRoundedSquarePlatformGeometry(size, thickness, cornerRadius, edgeBevel);
  try {
    const uv = geometry.getAttribute('uv');
    const edges = new Map<string, UvEdge>();
    const keyOf = (p: UvPoint): string => Math.round(p.u * 10000) + ',' + Math.round(p.v * 10000);
    const addEdge = (a: UvPoint, b: UvPoint): void => {
      const aKey = keyOf(a);
      const bKey = keyOf(b);
      const key = aKey < bKey ? aKey + '|' + bKey : bKey + '|' + aKey;
      const existing = edges.get(key);
      if (existing !== undefined) existing.count += 1;
      else edges.set(key, { a, b, count: 1 });
    };
    for (let i = 0; i < uv.count; i += 3) {
      const a = { u: uv.getX(i), v: uv.getY(i) };
      const b = { u: uv.getX(i + 1), v: uv.getY(i + 1) };
      const c = { u: uv.getX(i + 2), v: uv.getY(i + 2) };
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }
    return [...edges.values()].filter((edge) => edge.count === 1);
  } finally {
    geometry.dispose();
  }
}

/**
 * Rasterises the tile UV layout to a PNG file (grey lines on white), so it can be
 * saved to Photos, sent to Telegram, edited and uploaded back as a tile texture.
 */
export function createRoundedSquarePlatformUvPng(
  size: number,
  thickness: number,
  cornerRadius = PLATFORM_CORNER_RADIUS,
  edgeBevel = PLATFORM_EDGE_BEVEL,
): Uint8Array {
  const width = CANVAS_SIZE;
  const height = CANVAS_SIZE;
  const gray = new Uint8Array(width * height).fill(255);
  const mapSize = CANVAS_SIZE - PADDING * 2;

  const stamp = (x: number, y: number): void => {
    for (let dy = -LINE_HALF_WIDTH; dy <= LINE_HALF_WIDTH; dy += 1) {
      for (let dx = -LINE_HALF_WIDTH; dx <= LINE_HALF_WIDTH; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && py >= 0 && px < width && py < height) gray[py * width + px] = LINE_GRAY;
      }
    }
  };

  for (const edge of collectUvEdges(size, thickness, cornerRadius, edgeBevel)) {
    const x1 = PADDING + edge.a.u * mapSize;
    const y1 = PADDING + (1 - edge.a.v) * mapSize;
    const x2 = PADDING + edge.b.u * mapSize;
    const y2 = PADDING + (1 - edge.b.v) * mapSize;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      stamp(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t));
    }
  }

  // PNG scanlines: one filter byte (0 = none) before each row of pixels.
  const raw = new Uint8Array(height * (width + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0;
    raw.set(gray.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filter
  ihdr[12] = 0; // no interlace

  const parts = [
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlibStore(raw)),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}
