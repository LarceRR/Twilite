import { Host, Switch as ExpoSwitch } from '@expo/ui';
import { memo, type ReactElement } from 'react';

import { useIsDarkTheme, useThemeColors } from '../../colors/colors';
import { createSwitchHostProps } from './createSwitchHostProps';

export type SwitchProps = {
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
};

/**
 * Native platform switch: SwiftUI Toggle (Liquid Glass on iOS 26+) and
 * Material 3 Switch on Android, themed via Host seedColor from the active pack.
 */
function SwitchComponent({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: SwitchProps): ReactElement {
  const theme = useThemeColors();
  const isDark = useIsDarkTheme();
  const host = createSwitchHostProps({ accent: theme.accent, isDark });

  return (
    <Host
      matchContents
      seedColor={host.seedColor}
      colorScheme={host.colorScheme}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
    >
      <ExpoSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      />
    </Host>
  );
}

export const Switch = memo(SwitchComponent);
