import { describe, expect, it } from 'vitest';

import {
  createFieldGridWaveMaterial,
  registerFieldGridWaveMaterial,
  resetFieldGridWaveScene,
  syncFieldGridPixelLights,
  triggerFieldGridWaveOnScene,
  syncFieldGridWaveSceneTime,
} from './fieldGridWaveMaterial';

describe('fieldGridWaveMaterial', () => {
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
