import * as FileSystem from 'expo-file-system/legacy';
import { type ReactElement, useCallback, useEffect, useRef } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Image as SvgImage } from 'react-native-svg';

import { stripDataUrlBase64, tabAvatarPixelSize } from './tabAvatarCache';

export type TabAvatarCircularBakerProps = {
  readonly sourceUri: string;
  readonly destUri: string;
  /** Screen scale used when the cache path was built — bake at matching pixels. */
  readonly scale?: number;
  readonly onReady: (destUri: string) => void;
  readonly onError: () => void;
};

const MAX_ATTEMPTS = 6;
const RETRY_MS = 120;

/**
 * Off-screen baker: UITabBarItem cannot round icons, so we clip the photo to a
 * circle (transparent corners) and write a local PNG for NativeTabs `src`.
 * Rasterize at `pointSize × scale` so the tab bar stays sharp on retina.
 *
 * Important: do not treat the first empty `toDataURL` as fatal — when the size
 * constant changes we re-bake, and a premature export (before image decode)
 * returns empty base64 and would otherwise fall back to the glyph forever.
 */
export function TabAvatarCircularBaker({
  sourceUri,
  destUri,
  scale = PixelRatio.get(),
  onReady,
  onError,
}: TabAvatarCircularBakerProps): ReactElement {
  const svgRef = useRef<Svg | null>(null);
  const finishedRef = useRef(false);
  const attemptsRef = useRef(0);
  const pixelSize = tabAvatarPixelSize(scale);

  const exportCircular = useCallback(() => {
    if (finishedRef.current) {
      return;
    }

    const node = svgRef.current;
    if (node === null) {
      return;
    }

    attemptsRef.current += 1;
    const attempt = attemptsRef.current;

    node.toDataURL((base64) => {
      void (async () => {
        if (finishedRef.current) {
          return;
        }

        try {
          const raw = stripDataUrlBase64(typeof base64 === 'string' ? base64 : '');
          // Empty / tiny payloads = image not decoded yet. Retry instead of
          // permanently falling back to the profile glyph.
          if (raw.length < 32) {
            if (attempt >= MAX_ATTEMPTS) {
              onError();
            }
            return;
          }

          await FileSystem.writeAsStringAsync(destUri, raw, {
            encoding: FileSystem.EncodingType.Base64,
          });
          finishedRef.current = true;
          onReady(destUri);
        } catch {
          if (attempt >= MAX_ATTEMPTS) {
            onError();
          }
        }
      })();
    });
  }, [destUri, onError, onReady]);

  useEffect(() => {
    finishedRef.current = false;
    attemptsRef.current = 0;

    const timers: Array<ReturnType<typeof setTimeout>> = [];
    // Schedule a few exports: one shortly after mount (file:// often has no
    // onLoad), then retries in case the first toDataURL was empty.
    for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
      timers.push(setTimeout(exportCircular, RETRY_MS * i));
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [sourceUri, destUri, pixelSize, exportCircular]);

  const onImageLoad = useCallback(() => {
    exportCircular();
  }, [exportCircular]);

  const radius = pixelSize / 2;
  const clipId = `tabAvatarCircle-${pixelSize}`;

  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={[styles.host, { width: pixelSize, height: pixelSize }]}
    >
      <Svg ref={svgRef} width={pixelSize} height={pixelSize} collapsable={false}>
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={radius} cy={radius} r={radius} />
          </ClipPath>
        </Defs>
        <SvgImage
          href={{ uri: sourceUri }}
          width={pixelSize}
          height={pixelSize}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          onLoad={onImageLoad}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: -10_000,
    top: 0,
  },
});
