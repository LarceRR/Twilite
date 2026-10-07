import { describe, expect, it } from 'vitest';

import { screenHeaderTitle } from './screenHeaderTitle';

describe('screenHeaderTitle', () => {
  it('prefers an explicit title over the route title', () => {
    expect(screenHeaderTitle(false, 'Добавить', 'Создать момент')).toBe('Добавить');
  });

  it('falls back to the route title', () => {
    expect(screenHeaderTitle(false, undefined, 'Создать момент')).toBe('Создать момент');
  });

  it('hides the chrome title even when a route title exists', () => {
    expect(screenHeaderTitle(true, undefined, 'Создать момент')).toBeUndefined();
    expect(screenHeaderTitle(true, 'Добавить', 'Создать момент')).toBeUndefined();
  });
});
