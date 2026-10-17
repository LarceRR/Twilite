import { Stack } from 'expo-router';
import type { ReactElement } from 'react';

import { useThemeColors } from '@/design-system/colors/colors';

export default function ProfileLayout(): ReactElement {
  const theme = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.surface },
        animation: 'slide_from_right',
      }}
    />
  );
}
