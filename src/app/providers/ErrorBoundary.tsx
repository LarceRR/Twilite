import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { currentThemeColors } from '@/design-system/colors/colors';
import { Button } from '@/design-system/components/Button/Button';
import { Text } from '@/design-system/components/Text/Text';
import { layout, spacing } from '@/design-system/spacing/spacing';
import { toAppError } from '@/shared/errors';

type ErrorBoundaryProps = {
  readonly children: ReactNode;
};

type ErrorBoundaryState = {
  readonly message: string | null;
};

/**
 * Last line of defence. Class component because React only exposes render-phase
 * error capture through the lifecycle API.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: toAppError(error).message };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Reported through the console transport in development and Sentry in release.
    void toAppError(error);
    void info;
  }

  private readonly reset = (): void => {
    this.setState({ message: null });
  };

  override render(): ReactNode {
    const { message } = this.state;

    if (message === null) {
      return this.props.children;
    }

    const theme = currentThemeColors();

    return (
      <View style={[styles.root, { backgroundColor: theme.surface }]}>
        <Text variant="sectionTitle" align="center">
          Что-то пошло не так
        </Text>
        <Text variant="caption" align="center">
          {message}
        </Text>
        <Button label="Попробовать снова" onPress={this.reset} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: layout.screenGutter,
  },
});
