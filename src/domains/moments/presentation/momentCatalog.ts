import type { MomentKind, MomentPack, MomentPreview } from '../domain/entities/MomentCatalog';

export type { MomentPack, MomentPreview, MomentSprite } from '../domain/entities/MomentCatalog';

export type MomentCatalog = {
  readonly kind: MomentKind;
  readonly title: string;
  readonly subtitle: string;
  readonly recent: readonly MomentPreview[] | null;
  readonly packs: readonly MomentPack[];
};

export const MOMENT_CATALOG_COPY = {
  subtitle: 'Выберите подходящую анимацию, которая подходит под ваш момент',
  searchPlaceholder: 'Опишите момент, эмоцию или ситуацию...',
  recentTitle: 'Последние выбранные моменты',
  filterLabel: 'Фильтры',
  emptyTitle: 'Ничего не нашлось',
  emptyDescription: 'Попробуйте другое название, эмоцию или ситуацию',
  unavailableTitle: 'Каталог недоступен',
  unavailableDescription: 'Откройте его из хорошего или плохого момента',
  loadErrorTitle: 'Каталог не загрузился',
  loadErrorDescription: 'Проверьте соединение и откройте его ещё раз',
  vacantTitle: 'В каталоге пока пусто',
  vacantDescription: 'Опубликованных моментов этого типа ещё нет',
} as const;

export function momentCatalogTitle(kind: MomentKind): string {
  return kind === 'good' ? 'Каталог хороших моментов' : 'Каталог плохих моментов';
}

export function catalogFromPacks(kind: MomentKind, packs: readonly MomentPack[]): MomentCatalog {
  return {
    kind,
    title: momentCatalogTitle(kind),
    subtitle: MOMENT_CATALOG_COPY.subtitle,
    recent: null,
    packs,
  };
}

export function parseMomentCatalogKind(
  value: string | readonly string[] | undefined,
): MomentKind | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'good' || raw === 'bad') return raw;
  return null;
}

export function formatObjectCount(count: number): string {
  return `${count} ${objectCountNoun(count % 10, count % 100)}`;
}

export function filterMomentCatalog(catalog: MomentCatalog, rawQuery: string): MomentCatalog {
  const query = rawQuery.trim().toLocaleLowerCase('ru');
  if (query.length === 0) return catalog;

  return {
    ...catalog,
    recent: filterMoments(catalog.recent, query),
    packs: catalog.packs.flatMap((pack) => {
      const next = filterPack(pack, query);
      return next === null ? [] : [next];
    }),
  };
}

function objectCountNoun(mod10: number, mod100: number): string {
  if (mod10 === 1 && mod100 !== 11) return 'объект';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'объекта';
  return 'объектов';
}

function filterMoments(
  moments: readonly MomentPreview[] | null,
  query: string,
): readonly MomentPreview[] | null {
  if (moments === null) return null;
  const matched = moments.filter((moment) => textMatches(moment.name, query));
  return matched.length === 0 ? null : matched;
}

function filterPack(pack: MomentPack, query: string): MomentPack | null {
  if (textMatches(pack.title, query) || textMatches(pack.author, query)) return pack;
  const moments = pack.moments.filter((moment) => textMatches(moment.name, query));
  if (moments.length === 0) return null;
  return { ...pack, moments };
}

function textMatches(value: string, query: string): boolean {
  return value.toLocaleLowerCase('ru').includes(query);
}
