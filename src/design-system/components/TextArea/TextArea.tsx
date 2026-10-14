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

export type TextAreaProps = Omit<NativeTextInputProps, 'style' | 'multiline'> & {
  /** Optional system glyph shown in the upper-left corner. */
  readonly icon?: IconName;
  /** Custom leading content; when supplied it replaces the icon. */
  readonly leading?: ReactNode;
  /** Style for the glass shell, separate from the native TextInput style. */
  readonly containerStyle?: StyleProp<ViewStyle>;
  /** All standard React Native TextInput styles are preserved here. */
  readonly style?: NativeTextInputProps['style'];
};

function TextAreaComponent(
  {
    icon,
    leading,
    containerStyle,
    style,
    accessibilityLabel,
    placeholderTextColor,
    textAlignVertical,
    ...textInputProps
  }: TextAreaProps,
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
          multiline
          accessibilityLabel={accessibilityLabel ?? textInputProps.placeholder}
          placeholderTextColor={placeholderTextColor ?? theme.textTertiary}
          textAlignVertical={textAlignVertical ?? 'top'}
          style={[styles.input, { color: theme.textPrimary }, style]}
        />
      </View>
    </GlassSurface>
  );
}

const ForwardedTextArea = forwardRef(TextAreaComponent);

export const TextArea = memo(ForwardedTextArea);
TextArea.displayName = 'TextArea';

const styles = StyleSheet.create({
  surface: {
    minHeight: 120,
    justifyContent: 'flex-start',
  },
  row: {
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  input: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
    minHeight: 88,
    paddingVertical: spacing.xs,
    includeFontPadding: false,
  },
});
