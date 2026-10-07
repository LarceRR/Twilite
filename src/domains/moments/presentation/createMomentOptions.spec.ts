import { describe, expect, it } from 'vitest';

import { CREATE_MOMENT_OPTIONS, CREATE_MOMENT_SHEET_COPY } from './createMomentOptions';

describe('create moment sheet', () => {
  it('uses the sheet heading and prompt from the design', () => {
    expect(CREATE_MOMENT_SHEET_COPY).toEqual({
      title: 'Создать момент',
      subtitle: 'Выберите вариант момента, который хотите добавить в ваше поле',
    });
  });

  it('lists good and bad moment cards with short copy', () => {
    expect(CREATE_MOMENT_OPTIONS.map((option) => option.id)).toEqual(['good', 'bad']);

    const good = CREATE_MOMENT_OPTIONS.find((option) => option.id === 'good');
    const bad = CREATE_MOMENT_OPTIONS.find((option) => option.id === 'bad');

    expect(good).toMatchObject({
      title: 'Хороший момент',
      description: 'Тёплые воспоминания и радостные события',
      emphasized: false,
    });
    expect(bad).toMatchObject({
      title: 'Плохой момент',
      description: 'Трудные дни, которые тоже важны',
      emphasized: false,
    });
    expect(good).not.toHaveProperty('catalogLabel');
    expect(bad).not.toHaveProperty('catalogLabel');
  });
});
