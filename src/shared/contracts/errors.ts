/**
 * Stable API error codes — keep in sync with `@twilite/contracts@1.0.0`
 * (`twilite-backend/packages/contracts/src/errors.ts`).
 * Clients branch on `code`, never on localized server messages.
 */
export const CONTRACT_ERROR_CODES = [
  'MEDIA_UPLOAD_FORBIDDEN',
  'MEDIA_OBJECT_MISSING',
  'MEDIA_SIZE_MISMATCH',
  'MEDIA_CONTENT_TYPE_MISMATCH',
  'MEDIA_QUOTA_EXCEEDED',
  'PIXEL_OBJECT_INVALID_MANIFEST',
  'PIXEL_OBJECT_NOT_FOUND',
  'PIXEL_OBJECT_NOT_PUBLISHED',
  'PIXEL_OBJECT_SELF_MODERATION',
  'PIXEL_OBJECT_PENDING',
  'SURFACE_FULL',
  'SURFACE_METADATA_TOO_LARGE',
  'IDEMPOTENCY_CONFLICT',
  'CONTRACT_INVALID',
  'STORAGE_UNAVAILABLE',
] as const;

export type ContractErrorCode = (typeof CONTRACT_ERROR_CODES)[number];

export function isContractErrorCode(value: string): value is ContractErrorCode {
  return (CONTRACT_ERROR_CODES as readonly string[]).includes(value);
}
