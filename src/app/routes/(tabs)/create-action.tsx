import type { ReactElement } from 'react';
import { View } from 'react-native';

/**
 * NativeTabs requires a route for the trailing `role="search"` + control.
 * Selection is disabled; the trigger opens the root `/create` form sheet instead.
 */
export default function CreateActionTab(): ReactElement {
  return <View />;
}
