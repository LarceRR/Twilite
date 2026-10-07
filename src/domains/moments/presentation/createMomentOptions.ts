export type CreateMomentKind = 'good' | 'bad';

export type CreateMomentOption = {
  readonly id: CreateMomentKind;
  readonly title: string;
  readonly description: string;
  /** Accent border. Muted options stay without a highlighted edge. */
  readonly emphasized: boolean;
};

export const CREATE_MOMENT_SHEET_COPY = {
  title: 'Создать момент',
  subtitle: 'Выберите вариант момента, который хотите добавить в ваше поле',
} as const;

/** Options shown in the native create sheet, in visual order. */
export const CREATE_MOMENT_OPTIONS: readonly CreateMomentOption[] = [
  {
    id: 'good',
    title: 'Хороший момент',
    description: 'То, к чему хочется возвращаться',
    emphasized: false,
  },
  {
    id: 'bad',
    title: 'Плохой момент',
    description: 'То, что было непросто пережить',
    emphasized: false,
  },
];
