import { Stack, useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { MOMENT_FILTERS_SHEET_OPTIONS } from '@/app/navigation/momentFiltersSheetOptions';
import { MomentFiltersSheet } from '@/domains/moments/presentation/MomentFiltersSheet';

/**
 * Filters form sheet stacked above the moment catalog.
 * Options are set here too — root `Stack.Screen` options often stick to the
 * first bundle value under Fast Refresh and ignore later `sheetCornerRadius` edits.
 */
export default function MomentFiltersRoute(): ReactElement {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={MOMENT_FILTERS_SHEET_OPTIONS} />
      <MomentFiltersSheet
        onApply={() => {
          router.back();
        }}
      />
    </>
  );
}
