import { describe, expect, it } from 'vitest';

import {
  createFieldGridWaveMaterial,
  registerFieldGridWaveMaterial,
  resetFieldGridWaveScene,
  syncFieldGridPixelLights,
  syncFieldGridWaveSceneConfig,
  syncFieldGridWaveSceneTime,
  triggerFieldGridWaveOnScene,
} from './fieldGridWaveMaterial';
import { useFieldConfigStore } from './fieldConfigStore';

describe('fieldGridWaveMaterial', () => {
  it('updates pixel-glow configuration on every registered material', () => {
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

  it('applies pixel lights to registered tile materials', () => {
    const material = createFieldGridWaveMaterial(null, {
      depthWrite: true,
      receivesPixelLights: true,
    });
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
        },
      ]);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(true);
      expect(material.uniforms.uLightParams.value[0]?.x).toBe(1.25);
      expect(material.uniforms.uLightParams.value[0]?.y).toBe(220);
      expect(material.uniforms.uLightColors.value[0]?.getHex()).toBe(0xffae00);
      expect(material.uniforms.uLightParams.value[1]?.x).toBe(0);
      expect(material.receivesPixelLights).toBe(true);
      triggerFieldGridWaveOnScene(100, 200, 0.1);
      syncFieldGridWaveSceneTime(0.11);
      expect(material.uniforms.uStartTimes.value.some((time) => time === 0.1)).toBe(true);
    } finally {
      unregister();
      material.dispose();
      resetFieldGridWaveScene();
    }
  });

  it('keeps local pixel lights off the transparent grid overlay', () => {
    const material = createFieldGridWaveMaterial(null, { depthTest: false, receivesPixelLights: false });
    const unregister = registerFieldGridWaveMaterial(material);
    try {
      syncFieldGridPixelLights([
        {
          x: 10,
          y: 20,
          z: 6,
          color: '#FF5911',
          intensity: 2,
          distance: 300,
        },
      ]);
      expect(material.receivesPixelLights).toBe(false);
      expect(material.depthTest).toBe(false);
      expect(material.uniforms.uLightParams.value.every((params) => params.x === 0)).toBe(true);
    } finally {
      unregister();
      material.dispose();
      resetFieldGridWaveScene();
    }
  });
});
