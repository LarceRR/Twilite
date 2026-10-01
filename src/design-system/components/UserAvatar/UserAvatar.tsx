import { memo, type ReactElement, useEffect, useState } from 'react';
import { Image, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

import { colorRamps } from '../../colors/palette';
import { useThemeColors } from '../../colors/themeStore';
import { Text } from '../Text/Text';

export type UserAvatarProps = {
  readonly name: string;
  /** Photo. Falls back to the first letter of the name when absent or blank. */
  readonly imageUrl?: string | null;
  readonly size?: number;
  /** Stable colour seed — pass a user id so the tint never changes. */
  readonly seed?: string;
  readonly ringColor?: string | null;
  readonly ringWidth?: number;
  readonly labelColor?: string;
  readonly accessibilityLabel?: string;
  readonly style?: StyleProp<ViewStyle>;
};

const DEFAULT_SIZE = 36;

/** Dark enough that near-white initials always pass contrast. */
const TINTS = [
  colorRamps.ember500,
  colorRamps.damson500,
  colorRamps.verdigris500,
  colorRamps.slate500,
  colorRamps.basalt600,
] as const;

export function avatarInitial(name: string): string {
  const trimmed = name.trim();

  return trimmed.length === 0 ? '?' : trimmed.slice(0, 1).toUpperCase();
}

/** Colour is bound to the seed, not to render order: one person, one circle. */
export function avatarTint(seed: string): string {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2_147_483_647;
  }

  return TINTS[hash % TINTS.length] ?? TINTS[0];
}

/**
 * One avatar for the whole app: photo when there is one, initial when there is
 * not. Every surface that shows a person should reach for this instead of
 * hand-rolling another circle.
 */
function UserAvatarComponent({
  name,
  imageUrl = null,
  size = DEFAULT_SIZE,
  seed,
  ringColor = null,
  ringWidth = 2,
  labelColor = colorRamps.paper000,
  accessibilityLabel,
  style,
}: UserAvatarProps): ReactElement {
  const theme = useThemeColors();
  const uri = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  const [failed, setFailed] = useState(false);
  const hasPhoto = uri.length > 0 && !failed;
  const shape = { width: size, height: size, borderRadius: size / 2 };

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? name}
      style={[
        styles.root,
        shape,
        { backgroundColor: hasPhoto ? theme.surfaceSunken : avatarTint(seed ?? name) },
        ringColor === null ? null : { borderWidth: ringWidth, borderColor: ringColor },
        style,
      ]}
    >
      {hasPhoto ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={shape}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          variant="captionStrong"
          color={labelColor}
          style={{ fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.5) }}
        >
          {avatarInitial(name)}
        </Text>
      )}
    </View>
  );
}

export const UserAvatar = memo(UserAvatarComponent);

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
