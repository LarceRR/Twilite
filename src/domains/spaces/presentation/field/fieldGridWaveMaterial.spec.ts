import { describe, expect, it } from 'vitest';

import {
  createFieldGridWaveMaterial,
  registerFieldGridWaveMaterial,
  resetFieldGridWaveScene,
  syncFieldGridPixelLights,
  syncFieldGridWaveSceneConfig,
  triggerFieldGridWaveOnScene,
  syncFieldGridWaveSceneTime,
} from './fieldGridWaveMaterial';
import { useFieldConfigStore } from './fieldConfigStore';

describe('fieldGridWaveMaterial', () => {
  it('updates pixel-glow size on every registered material after a config change', () => {
    const material = createFieldGridWaveMaterial();
    const unregister = registerFieldGridWaveMaterial(material);
    try {
      useFieldConfigStore.getState().setSection('lighting', {
        objectGlow: { pixelOverlay: { pixelSizePx: 13 } },
        surfaceAmbientColor: '#FF5911',
        surfaceAmbientIntensity: 0.12,
      });
      syncFieldGridWaveSceneConfig();
      expect(material.uniforms.uLightPixelSize.value).toBe(13);
      expect(material.uniforms.uAmbientColor.value.getHex()).toBe(0xff5911);
      expect(material.uniforms.uAmbientIntensity.value).toBe(0.12);
    } finally {
      useFieldConfigStore.getState().reset();
      syncFieldGridWaveSceneConfig();
      unregister();
      material.dispose();
      resetFieldGridWaveScene();
    }
  });

  it('uses one shared pixel-light uniform set for registered surfaces', () => {
    const material = createFieldGridWaveMaterial();
    const unregister = registerFieldGridWaveMaterial(material);
    try {
      syncFieldGridPixelLights([
        {
          x: 120,
          y: -30,
          z: 36,
          color: '#FFAE00',
          intensity: 1.25,
          distance: 220,
          platformTopZ: 6,
          platformHalfSize: 30,
        },
      ]);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
      expect(material.uniforms.uLightParams.value[0]?.x).toBe(1.25);
      expect(material.uniforms.uLightParams.value[0]?.y).toBe(220);
      expect(material.uniforms.uLightColors.value[0]?.getHex()).toBe(0xffae00);
      expect(material.uniforms.uLightOccluders.value[0]?.x).toBe(6);
      expect(material.uniforms.uLightOccluders.value[0]?.y).toBe(30);
      expect(material.uniforms.uLightParams.value[1]?.x).toBe(0);
      triggerFieldGridWaveOnScene(100, 200, 0.1);
      syncFieldGridWaveSceneTime(0.11);
      expect(material.uniforms.uStartTimes.value.some((time) => time === 0.1)).toBe(true);
    } finally {
      unregister();
      material.dispose();
      resetFieldGridWaveScene();
    }
  });
});
