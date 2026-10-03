import type { ReactElement } from 'react';

import { Screen } from '@/design-system/components/Screen/Screen';

/** Create tab shell — plus button stays in the tab bar. */
export default function CreateTabScreen(): ReactElement {
  return (
    <Screen title="Добавить" reserveTabBar>
      {null}
    </Screen>
  );
}
