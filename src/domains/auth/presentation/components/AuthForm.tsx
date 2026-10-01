import { memo, type ReactElement } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';
import { radius } from '@/design-system/radius/radius';
import { layout, spacing } from '@/design-system/spacing/spacing';
import { typography } from '@/design-system/typography/typography';

export type AuthField = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly secure?: boolean;
  readonly autoComplete?: 'email' | 'password' | 'name' | 'new-password';
  readonly keyboardType?: 'default' | 'email-address';
};

export type AuthFormProps = {
  readonly fields: readonly AuthField[];
};

function AuthFormComponent({ fields }: AuthFormProps): ReactElement {
  const theme = useThemeColors();

  return (
    <View style={styles.root}>
      {fields.map((field) => (
        <View key={field.id} style={styles.group}>
          <Text variant="captionStrong">{field.label}</Text>
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            placeholder={field.placeholder}
            placeholderTextColor={theme.textTertiary}
            secureTextEntry={field.secure ?? false}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={field.keyboardType ?? 'default'}
            {...(field.autoComplete === undefined ? {} : { autoComplete: field.autoComplete })}
            style={[
              styles.input,
              { backgroundColor: theme.surfaceSunken, color: theme.textPrimary },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

export const AuthForm = memo(AuthFormComponent);

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.xs,
  },
  input: {
    ...typography.body,
    minHeight: layout.controlHeight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
});
