export type MomentKind = 'good' | 'bad';

export type MomentFrame = {
  readonly frame: number;
  readonly durationMs: number;
};

/** Spritesheet description. Pixel bytes stay on the sheet URL. */
export type MomentSprite = {
  readonly sheetUrl: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly columns: number;
  readonly rows: number;
  readonly frameCount: number;
  readonly frames: readonly MomentFrame[];
  readonly staticPreviewFrame: number;
};

export type MomentPreview = {
  readonly id: string;
  readonly name: string;
  readonly previewUrl: string | null;
  readonly sprite: MomentSprite | null;
};

export type MomentPack = {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly official: boolean;
  readonly avatarUrl: string | null;
  readonly objectCount: number;
  readonly byteSize: number;
  readonly moments: readonly MomentPreview[];
};

export type MomentCatalogPage = {
  readonly packs: readonly MomentPack[];
  readonly nextCursor: string | null;
};

export type MomentCatalogQuery = {
  readonly kind: MomentKind;
  readonly cursor?: string;
  readonly query?: string;
  readonly limit?: number;
};
