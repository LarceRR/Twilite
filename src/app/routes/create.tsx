import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { openMomentCatalog } from '@/app/navigation/openMomentCatalog';
import { CreateMomentSheet } from '@/domains/moments/presentation/CreateMomentSheet';
import type { CreateMomentKind } from '@/domains/moments/presentation/createMomentOptions';

/** Create flow presented as a root native form sheet from the tab-bar + control. */
export default function CreateScreen(): ReactElement {
  const router = useRouter();
  const openCatalog = (kind: CreateMomentKind): void => {
    openMomentCatalog(router, kind);
  };

  return <CreateMomentSheet onSelect={openCatalog} />;
}
