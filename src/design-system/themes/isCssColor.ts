const HEX = /^#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const RGBA =
  /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|1|0?\.\d+|1\.0+)\s*\)$/;
const RGB = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;

/** Accepts #RRGGBB, #RRGGBBAA, rgb(), rgba() used by ThemeColors. */
export function isCssColor(value: string): boolean {
  const trimmed = value.trim();
  return HEX.test(trimmed) || RGBA.test(trimmed) || RGB.test(trimmed);
}

/** Sky stops must be opaque hex for DataTexture sampling. */
export function isOpaqueHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}
