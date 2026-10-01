import { describe, expect, it } from 'vitest';

import {
  DARK_SURFACE_BACKGROUND,
  gridColorFor,
  isLightSurface,
  LIGHT_SURFACE_BACKGROUND,
  resolveSurfaceBackground,
  surfaceLuminance,
} from './surfaceTheme';

describe('gridColorFor', () => {
  it('на белом фоне даёт линии вдвое ближе к фону, чем раньше', () => {
    // Прежнее значение было #EBEBEB (8% к чёрному), стало 4%.
    expect(gridColorFor('#FFFFFF')).toBe('#F5F5F5');
  });

  it('на тёмном фоне осветляет линии вместо затемнения', () => {
    expect(surfaceLuminance(gridColorFor(DARK_SURFACE_BACKGROUND))).toBeGreaterThan(
      surfaceLuminance(DARK_SURFACE_BACKGROUND),
    );
  });

  it('держит линии в пределах нескольких процентов от фона', () => {
    for (const background of [LIGHT_SURFACE_BACKGROUND, DARK_SURFACE_BACKGROUND, '#7C8796']) {
      const delta = Math.abs(
        surfaceLuminance(gridColorFor(background)) - surfaceLuminance(background),
      );

      expect(delta).toBeLessThan(0.08);
    }
  });

  it('понимает короткую запись цвета', () => {
    expect(gridColorFor('#fff')).toBe('#F5F5F5');
  });

  it('на мусоре не падает и возвращает валидный цвет', () => {
    expect(gridColorFor('не цвет')).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('isLightSurface', () => {
  it('делит палитру на светлую и тёмную половину', () => {
    expect(isLightSurface(LIGHT_SURFACE_BACKGROUND)).toBe(true);
    expect(isLightSurface(DARK_SURFACE_BACKGROUND)).toBe(false);
  });
});

describe('resolveSurfaceBackground', () => {
  it('следует за темой, когда фон не выбран вручную', () => {
    expect(resolveSurfaceBackground(null, 'light')).toBe(LIGHT_SURFACE_BACKGROUND);
    expect(resolveSurfaceBackground(null, 'dark')).toBe(DARK_SURFACE_BACKGROUND);
  });

  it('предпочитает горизонт активной темы scheme-default', () => {
    expect(resolveSurfaceBackground(null, 'light', '#8EB7E8')).toBe('#8EB7E8');
  });

  it('уважает ручной выбор в любой теме', () => {
    expect(resolveSurfaceBackground('#C6CDD6', 'dark', '#111111')).toBe('#C6CDD6');
  });
});
