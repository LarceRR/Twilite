import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { DeviceInfoDto } from '@/shared/contracts';

export function nativeDeviceInfo(): DeviceInfoDto {
  const platform =
    Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
      ? Platform.OS
      : 'unknown';

  const version = Constants.expoConfig?.version;
  const model = Constants.deviceName;

  return {
    platform,
    model: typeof model === 'string' && model.length > 0 ? model.slice(0, 120) : null,
    appVersion: typeof version === 'string' && version.length > 0 ? version.slice(0, 40) : null,
  };
}
