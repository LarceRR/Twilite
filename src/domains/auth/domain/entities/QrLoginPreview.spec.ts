import { describe, expect, it } from 'vitest';

import { describeQrRequestingDevice } from './QrLoginPreview';

describe('describeQrRequestingDevice', () => {
  it('names the playground explicitly', () => {
    expect(
      describeQrRequestingDevice({
        platform: 'web',
        model: 'Mozilla/5.0',
        appVersion: 'tpg-web',
        ipLabel: '127.0.0.x',
      }),
    ).toEqual({
      title: 'Twilite Pixelart Generator',
      subtitle: '127.0.0.x',
    });
  });
});
