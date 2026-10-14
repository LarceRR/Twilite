import { Ionicons } from '@expo/vector-icons';
import { forwardRef, memo, type ReactElement, type ReactNode } from 'react';
import {
  TextInput as NativeTextInput,
  type TextInputProps as NativeTextInputProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { useThemeColors } from '../../colors/themeStore';
import { icons, type IconName } from '../../icons/icons';
import { radius } from '../../radius/radius';
import { layout, spacing } from '../../spacing/spacing';
import { typography } from '../../typography/typography';
import { GlassSurface } from '../GlassSurface/GlassSurface';

export type InputProps = Omit<NativeTextInputProps, 'style'> & {
  /** Optional system glyph displayed before the editable text. */
  readonly icon?: IconName;
  /** Custom leading content; when supplied it replaces the icon. */
  readonly leading?: ReactNode;
  /** Style for the glass shell, separate from the native TextInput style. */
  readonly containerStyle?: StyleProp<ViewStyle>;
  /** All standard React Native TextInput styles are preserved here. */
  readonly style?: NativeTextInputProps['style'];
};

function InputComponent(
  {
    icon,
    leading,
    containerStyle,
    style,
    accessibilityLabel,
    placeholderTextColor,
    ...textInputProps
  }: InputProps,
  ref: React.ForwardedRef<NativeTextInput>,
): ReactElement {
  const theme = useThemeColors();
  const leadingContent =
    leading ??
    (icon === undefined ? (
      <Ionicons name={icons.search} size={18} color={theme.textTertiary} />
    ) : (
      <Ionicons name={icon} size={18} color={theme.textTertiary} />
    ));

  return (
    <GlassSurface
      cornerRadius={radius.md}
      interactive
      tintColor={theme.surfaceSunken}
      style={[styles.surface, containerStyle]}
    >
      <View style={styles.row}>
        {leadingContent === null ? null : (
          <View pointerEvents="none" style={styles.leading}>
            {leadingContent}
          </View>
        )}
        <NativeTextInput
          ref={ref}
          {...textInputProps}
          accessibilityLabel={accessibilityLabel ?? textInputProps.placeholder}
          placeholderTextColor={placeholderTextColor ?? theme.textTertiary}
          style={[styles.input, { color: theme.textPrimary }, style]}
        />
      </View>
    </GlassSurface>
  );
}

const ForwardedInput = forwardRef(InputComponent);

export const Input = memo(ForwardedInput);
Input.displayName = 'Input';

const styles = StyleSheet.create({
  surface: {
    minHeight: layout.controlHeightCompact,
    justifyContent: 'center',
  },
  row: {
    minHeight: layout.controlHeightCompact,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.sm,
    includeFontPadding: false,
  },
});
