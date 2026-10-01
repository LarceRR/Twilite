import { memo, type ReactElement, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PixelSheetPreview } from '@/domains/pixel-objects/presentation/components/PixelSheetPreview';
import {
  fieldSpriteBoxPx,
  PIXEL_SHEET_MAX_DISPLAY_PX,
  pixelSheetFitSize,
} from '@/shared/pixelObject/pixelSheetDisplayLimits';

import type { ViewportSize } from './fieldCamera';
import { projectBridgeCell } from './fieldCamera';
import type { FieldSpritePlacement } from './FieldObjectLayer';
import { compareFieldSpritesBackToFront, fieldSpriteZIndex } from './fieldSpriteDepth';

type FieldSpriteOverlayProps = {
  readonly viewport: ViewportSize;
  readonly sprites: readonly FieldSpritePlacement[];
};

/**
 * 2D spritesheet overlay — reliable on iOS (RN Image).
 * Positions via the same camera projection as the 3D bridge.
 */
function FieldSpriteOverlayComponent({ viewport, sprites }: FieldSpriteOverlayProps): ReactElement {
  const orderedSprites = useMemo(
    () => [...sprites].sort(compareFieldSpritesBackToFront),
    [sprites],
  );

  if (viewport.width < 1 || viewport.height < 1) {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {orderedSprites.map((sprite) => {
        const projected = projectBridgeCell(sprite.cell, viewport);
        const boxPx = fieldSpriteBoxPx(projected.cellPx, PIXEL_SHEET_MAX_DISPLAY_PX, sprite.cell.y);
        const fit = pixelSheetFitSize(
          boxPx,
          sprite.dto.sheet.frameWidth,
          sprite.dto.sheet.frameHeight,
        );
        const depth = fieldSpriteZIndex(sprite.cell);
        return (
          <View
            key={sprite.surfaceObjectId}
            style={[
              styles.sprite,
              {
                left: projected.left - fit.width / 2,
                top: projected.top - fit.height,
                width: fit.width,
                height: fit.height,
                zIndex: depth,
              },
            ]}
          >
            <PixelSheetPreview mobile={sprite.dto} size={boxPx} />
          </View>
        );
      })}
    </View>
  );
}

export const FieldSpriteOverlay = memo(FieldSpriteOverlayComponent);

const styles = StyleSheet.create({
  sprite: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
