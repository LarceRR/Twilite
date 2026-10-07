export type MomentFilterColor = {
  readonly id: string;
  readonly label: string;
  readonly hex: string;
};

export type MomentFiltersDraft = {
  readonly priceFrom: string;
  readonly priceTo: string;
  readonly colorId: string;
};

export const MOMENT_FILTERS_COPY = {
  title: 'Фильтры',
  applyLabel: 'Применить',
  priceLabel: 'Цена',
  priceFrom: 'от',
  priceTo: 'до',
  colorLabel: 'Цвет',
} as const;

/** Apply control tint from the filters frame (gold liquid-glass pill). */
export const MOMENT_FILTERS_APPLY_TINT = '#F2BD4F';

export const MOMENT_FILTER_COLORS = [
  { id: 'red', label: 'Красный', hex: '#FF0000' },
  { id: 'orange', label: 'Оранжевый', hex: '#F08C34' },
  { id: 'yellow', label: 'Жёлтый', hex: '#F2BD4F' },
  { id: 'green', label: 'Зелёный', hex: '#4F7E5A' },
  { id: 'blue', label: 'Синий', hex: '#4FA093' },
  { id: 'purple', label: 'Фиолетовый', hex: '#A2648C' },
] as const satisfies readonly MomentFilterColor[];

const FIRST_FILTER_COLOR: MomentFilterColor = MOMENT_FILTER_COLORS[0];

export const DEFAULT_MOMENT_FILTERS: MomentFiltersDraft = {
  priceFrom: '0',
  priceTo: '9999',
  colorId: FIRST_FILTER_COLOR.id,
};

/** Catalog filters sheet is 297pt on the 844pt reference phone. */
export const MOMENT_FILTERS_SHEET_HEIGHT_FRACTION = 297 / 844;

/** Measurements from the Filters (Native Sheet) Figma frame. */
export const momentFiltersLayout = {
  sheetPaddingTop: 10,
  sheetPaddingX: 24,
  sheetPaddingBottom: 40,
  sectionGap: 30,
  headerMinHeight: 36,
  bodyGap: 20,
  priceLabelGap: 8,
  priceRowGap: 10,
  priceFieldHeight: 32,
  priceFieldRadius: 4,
  priceFieldPaddingX: 10,
  dashWidth: 8,
  colorRowGap: 20,
  colorValueGap: 8,
  swatchSize: 20,
  swatchRadius: 4,
} as const;

export function momentFilterColorById(id: string): MomentFilterColor {
  return MOMENT_FILTER_COLORS.find((color) => color.id === id) ?? FIRST_FILTER_COLOR;
}

export function nextMomentFilterColorId(currentId: string): string {
  const index = MOMENT_FILTER_COLORS.findIndex((color) => color.id === currentId);
  const next = index < 0 ? 0 : (index + 1) % MOMENT_FILTER_COLORS.length;
  return MOMENT_FILTER_COLORS[next]?.id ?? FIRST_FILTER_COLOR.id;
}

/** Digits only; empty string stays empty for controlled inputs. */
export function sanitizePriceInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function parsePriceValue(raw: string): number | null {
  if (raw.trim().length === 0) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return value;
}
