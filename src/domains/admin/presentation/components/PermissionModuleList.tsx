import { Ionicons } from '@expo/vector-icons';
import {
  Fragment,
  memo,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Divider } from '@/design-system/components/Divider/Divider';
import { Text } from '@/design-system/components/Text/Text';
import { icons } from '@/design-system/icons/icons';
import { layout, spacing } from '@/design-system/spacing/spacing';

import type { AdminPermission } from '../../domain/entities/AdminModels';
import {
  filterPermissions,
  groupPermissionsByModule,
} from '../../domain/services/permissionCatalog';

export type PermissionModuleListProps = {
  readonly permissions: readonly AdminPermission[];
  readonly query: string;
  readonly emptyLabel?: string;
  readonly renderItem: (permission: AdminPermission) => ReactNode;
};

function PermissionModuleListComponent({
  permissions,
  query,
  emptyLabel = 'Ничего не найдено',
  renderItem,
}: PermissionModuleListProps): ReactElement {
  const theme = useThemeColors();
  const filtered = useMemo(
    () => filterPermissions(permissions, query),
    [permissions, query],
  );
  const buckets = useMemo(() => groupPermissionsByModule(filtered), [filtered]);
  const searching = query.trim().length > 0;

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!searching) {
      setExpanded(new Set());
      return;
    }

    setExpanded(
      new Set(
        groupPermissionsByModule(filterPermissions(permissions, query)).map(
          (bucket) => bucket.module,
        ),
      ),
    );
  }, [permissions, query, searching]);

  if (buckets.length === 0) {
    return (
      <BlurCard>
        <Text variant="caption">{emptyLabel}</Text>
      </BlurCard>
    );
  }

  return (
    <View style={styles.root}>
      {buckets.map((bucket) => {
        const isOpen = expanded.has(bucket.module);
        return (
          <BlurCard key={bucket.module}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`Модуль ${bucket.module}, ${bucket.permissions.length}`}
              hitSlop={layout.hitSlop}
              onPress={() => {
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(bucket.module)) {
                    next.delete(bucket.module);
                  } else {
                    next.add(bucket.module);
                  }
                  return next;
                });
              }}
              style={styles.header}
            >
              <View style={styles.headerText}>
                <Text variant="bodyStrong">{bucket.module}</Text>
                <Text variant="caption">{String(bucket.permissions.length)}</Text>
              </View>
              <Ionicons
                name={isOpen ? icons.chevronDown : icons.chevronRight}
                size={18}
                color={theme.textTertiary}
              />
            </Pressable>

            {isOpen
              ? bucket.permissions.map((permission) => (
                  <Fragment key={permission.id}>
                    <Divider />
                    {renderItem(permission)}
                  </Fragment>
                ))
              : null}
          </BlurCard>
        );
      })}
    </View>
  );
}

export const PermissionModuleList = memo(PermissionModuleListComponent);

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
