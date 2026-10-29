import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColors } from '@/design-system/colors/colors';

export default function EmptyFieldScreen(): ReactElement {
  const theme = useThemeColors();
  return <View style={[styles.root, { backgroundColor: theme.surface }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
