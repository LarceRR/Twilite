export type QrLoginPlatform = 'ios' | 'android' | 'web' | 'unknown';

export type QrRequestingDevice = {
  readonly platform: QrLoginPlatform;
  readonly model: string | null;
  readonly appVersion: string | null;
  readonly ipLabel: string;
};

export type QrLoginPreview = {
  readonly challengeId: string;
  readonly expiresAt: string;
  readonly requestingDevice: QrRequestingDevice;
};

export function describeQrRequestingDevice(device: QrRequestingDevice): {
  readonly title: string;
  readonly subtitle: string;
} {
  const title =
    device.appVersion === 'tpg-web'
      ? 'Twilite Pixelart Generator'
      : device.platform === 'web'
        ? 'Браузер на компьютере'
        : device.platform === 'ios'
          ? 'Устройство iOS'
          : device.platform === 'android'
            ? 'Устройство Android'
            : 'Неизвестное устройство';

  const parts = [device.ipLabel];
  if (device.model !== null && device.model.length > 0 && device.appVersion !== 'tpg-web') {
    parts.unshift(device.model);
  }

  return { title, subtitle: parts.filter((part) => part.length > 0).join(' · ') };
}
