import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { PixelartGeneratorLogo } from '@/design-system/brand/PixelartGeneratorLogo';
import { useThemeColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';
import { UserAvatar } from '@/design-system/components/UserAvatar/UserAvatar';
import { icons } from '@/design-system/icons/icons';
import { fontFamily, fontWeights } from '@/design-system/typography/fonts';

import type { MomentPack } from '../domain/entities/MomentCatalog';
import { formatByteSize } from './formatByteSize';
import { formatObjectCount } from './momentCatalog';
import { momentCatalogLayout as layout } from './momentCatalogLayout';
import { authorizedImageSource, type ImageHeaders } from './spritePlayback';

export type MomentPackHeaderProps = {
  readonly pack: MomentPack;
  readonly imageHeaders: ImageHeaders;
};

function MomentPackHeaderComponent({ pack, imageHeaders }: MomentPackHeaderProps): ReactElement {
  return (
    <View style={styles.row}>
      <View style={styles.identity}>
        <PackAvatar headers={imageHeaders} pack={pack} />
        <PackTitles author={pack.author} title={pack.title} />
      </View>
      <PackMeta byteSize={pack.byteSize} objectCount={pack.objectCount} />
    </View>
  );
}

function PackAvatar({
  pack,
  headers,
}: {
  readonly pack: MomentPack;
  readonly headers: ImageHeaders;
}): ReactElement {
  if (pack.official) {
    return (
      <View style={styles.avatar}>
        <PixelartGeneratorLogo size={layout.avatarSize} />
      </View>
    );
  }
  return (
    <RemoteAvatar
      fallback={<UserAvatar name={pack.author} seed={pack.id} size={layout.avatarSize} />}
      headers={headers}
      uri={pack.avatarUrl}
    />
  );
}

function RemoteAvatar({
  uri,
  headers,
  fallback,
}: {
  readonly uri: string | null;
  readonly headers: ImageHeaders;
  readonly fallback: ReactElement;
}): ReactElement {
  const [failed, setFailed] = useState(false);
  const source = useMemo(
    () => (uri === null || failed ? null : authorizedImageSource(uri, headers)),
    [uri, failed, headers],
  );
  if (source === null) return fallback;
  return (
    <Image
      accessible={false}
      onError={() => setFailed(true)}
      source={source}
      style={styles.avatar}
    />
  );
}

function PackTitles({
  title,
  author,
}: {
  readonly title: string;
  readonly author: string;
}): ReactElement {
  const theme = useThemeColors();

  return (
    <View style={styles.titles}>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <Text color={theme.textTertiary} numberOfLines={1} style={styles.author}>
        {author}
      </Text>
    </View>
  );
}

function PackMeta({
  objectCount,
  byteSize,
}: {
  readonly objectCount: number;
  readonly byteSize: number;
}): ReactElement {
  const theme = useThemeColors();

  return (
    <View style={styles.meta}>
      <Text color={theme.textTertiary} style={styles.metaText}>
        {formatObjectCount(objectCount)}
      </Text>
      <View style={styles.size}>
        <Ionicons name={icons.download} size={layout.metaIconSize} color={theme.textTertiary} />
        <Text color={theme.textTertiary} style={styles.metaText}>
          {formatByteSize(byteSize)}
        </Text>
      </View>
    </View>
  );
}

export const MomentPackHeader = memo(MomentPackHeaderComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  titles: {
    flexShrink: 1,
  },
  avatar: {
    width: layout.avatarSize,
    height: layout.avatarSize,
    borderRadius: layout.avatarSize / 2,
    overflow: 'hidden',
  },
  title: {
    fontFamily: fontFamily('semiBold'),
    fontWeight: fontWeights.semiBold,
    fontSize: 10,
    lineHeight: 12,
  },
  author: {
    fontSize: 8,
    lineHeight: 9,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  size: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: 8,
    lineHeight: 9,
  },
});
