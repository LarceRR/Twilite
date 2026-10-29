import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { isEnabled } from '@/app/config/featureFlags';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { EmptyState } from '@/design-system/components/EmptyState/EmptyState';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { icons } from '@/design-system/icons/icons';

/**
 * Insights are gated by entitlements, never by a plan name. Until the billing
 * module reports the entitlement, the screen offers the upgrade path instead of
 * pretending the feature is unavailable.
 */
export function AiScreen(): ReactElement {
  const router = useRouter();

  if (!isEnabled('ai')) {
    return (
      <Screen title="AI">
        <EmptyState icon={icons.ai} title="Скоро" description="AI-раздел появится позже." />
      </Screen>
    );
  }

  return (
    <Screen title="AI">
      <BlurCard title="Доступ">
        <Text variant="caption">
          AI-функции входят в расширенный доступ. Он открывает дополнительные инструменты и
          голосовые заметки.
        </Text>
        <Button
          label="Посмотреть доступ"
          variant="secondary"
          onPress={() => router.push('/billing')}
        />
      </BlurCard>
    </Screen>
  );
}
