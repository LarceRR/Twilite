import { memo, type ReactElement } from 'react';
import { type ImageSourcePropType, StyleSheet, View } from 'react-native';

import { Screen } from '@/design-system/components/Screen/Screen';
import { SheetHeading } from '@/design-system/components/SheetHeading/SheetHeading';
import { spacing } from '@/design-system/spacing/spacing';

import badMomentArt from '../../../assets/moments/bad-moment.png';
import goodMomentArt from '../../../assets/moments/good-moment.png';
import {
  CREATE_MOMENT_OPTIONS,
  CREATE_MOMENT_SHEET_COPY,
  type CreateMomentKind,
} from './createMomentOptions';
import { MomentOptionCard } from './MomentOptionCard';

const ART: Record<CreateMomentKind, ImageSourcePropType> = {
  good: goodMomentArt,
  bad: badMomentArt,
};

export type CreateMomentSheetProps = {
  readonly onSelect?: (kind: CreateMomentKind) => void;
};

function CreateMomentSheetComponent({ onSelect }: CreateMomentSheetProps): ReactElement {
  return (
    <Screen hideBack hideHeader reserveTabBar={false} scroll={false} skipTopSafeArea>
      <View style={styles.sheet}>
        <SheetHeading
          title={CREATE_MOMENT_SHEET_COPY.title}
          subtitle={CREATE_MOMENT_SHEET_COPY.subtitle}
        />
        <View style={styles.stage}>
          <View style={styles.row}>
            {CREATE_MOMENT_OPTIONS.map((option) => (
              <MomentOptionCard
                key={option.id}
                art={ART[option.id]}
                option={option}
                onSelect={() => onSelect?.(option.id)}
              />
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}

export const CreateMomentSheet = memo(CreateMomentSheetComponent);

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
});
