import { type ReactElement, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Divider } from '@/design-system/components/Divider/Divider';
import { EmptyState } from '@/design-system/components/EmptyState/EmptyState';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { type IconName, icons } from '@/design-system/icons/icons';
import { spacing } from '@/design-system/spacing/spacing';
import { useSpaces } from '@/domains/spaces/presentation/hooks/useSpaces';
import { kindPresentation } from '@/scene/surface-objects/kindPresentation';

import type { TimelineEvent } from '../../domain/entities/TimelineEvent';
import { useTimeline } from '../hooks/useTimeline';

const EVENT_TITLES: Readonly<Record<string, string>> = {
  SurfaceObjectCreated: 'Появился объект',
  SurfaceObjectStateChanged: 'Объект изменился',
  SurfaceObjectDeleted: 'Объект убран',
  SpaceCreated: 'Поле создано',
  MemberJoined: 'Участник присоединился',
};

function readString(payload: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = payload[key];

  return typeof value === 'string' && value.length > 0 ? value : null;
}

function describe(event: TimelineEvent): {
  title: string;
  subtitle: string;
  icon: IconName;
} {
  const kind = readString(event.payload, 'kind');
  const presentation = kind === null ? null : kindPresentation(kind);
  const title = EVENT_TITLES[event.type] ?? 'Событие';
  const time = new Date(event.createdAt).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    title: presentation === null ? title : `${title}: ${presentation.title.toLowerCase()}`,
    subtitle: time,
    icon: presentation?.icon ?? icons.timeline,
  };
}

export function TimelineScreen(): ReactElement {
  const { activeSpace } = useSpaces();
  const timeline = useTimeline(activeSpace?.id ?? null);

  const grouped = useMemo(() => timeline.events.map(describe), [timeline.events]);

  return (
    <Screen title="История" subtitle={activeSpace?.title ?? 'Пространство не выбрано'}>
      {timeline.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator />
        </View>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={icons.timeline}
          title="Пока пусто"
          description="Здесь появятся моменты, которые вы отметили на поверхности."
        />
      ) : (
        <BlurCard>
          {grouped.map((item, index) => (
            <View key={timeline.events[index]?.id ?? index}>
              {index === 0 ? null : <Divider />}
              <ListRow title={item.title} subtitle={item.subtitle} icon={item.icon} />
            </View>
          ))}
        </BlurCard>
      )}

      {timeline.hasMore ? (
        <Button
          label="Показать раньше"
          variant="secondary"
          loading={timeline.isLoadingMore}
          onPress={timeline.loadMore}
        />
      ) : null}

      {timeline.error === null ? null : (
        <Text variant="caption" align="center">
          Не удалось загрузить историю
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: spacing.xxl,
  },
});
